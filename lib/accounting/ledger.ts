import type { Paise } from "./money";

export type TransactionType = "cash_sale" | "credit_sale" | "payment_received";

export interface LedgerEntry {
  id: string;
  type: TransactionType;
  amountPaise: Paise; // always a positive integer; direction comes from `type`
  occurredOn: string; // ISO date, YYYY-MM-DD
  dueDate?: string | null; // explicit due date; only meaningful for credit_sale
  voided: boolean;
}

export interface AccountingConfig {
  /** Business-level fallback credit period, in days, used when no explicit
   * due date and no customer-level override is available. */
  defaultCreditPeriodDays: number;
  /** Customer-level override of the credit period, if configured. */
  customerPaymentTermsDays?: number | null;
}

export interface CreditLot {
  transactionId: string;
  occurredOn: string;
  dueDate: string;
  originalPaise: Paise;
  remainingPaise: Paise;
}

export type CustomerLedgerStatus = "paid" | "pending" | "overdue";

export interface CustomerAccountingResult {
  totalCreditPaise: Paise;
  totalPaymentsPaise: Paise;
  /** credit - payments. Can be negative, meaning the customer has a credit
   * balance (overpaid) with this business. */
  outstandingPaise: Paise;
  /** Always >= 0. Sum of unpaid credit lots whose due date has passed. */
  overdueAmountPaise: Paise;
  /** 0 when not overdue; otherwise days since the oldest overdue lot's due date. */
  daysOverdue: number;
  lastTransactionDate: string | null;
  lastPaymentDate: string | null;
  status: CustomerLedgerStatus;
  /** Exposed for audit/debugging — the FIFO credit lots and what remains unpaid. */
  lots: CreditLot[];
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function compareDateThenId(a: { occurredOn: string; id: string }, b: { occurredOn: string; id: string }) {
  if (a.occurredOn !== b.occurredOn) return a.occurredOn < b.occurredOn ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Deterministic, FIFO accounting over a customer's non-voided ledger entries.
 *
 * Every credit sale opens a "lot" due on (explicit due date, else occurredOn +
 * customer terms, else occurredOn + business default). Payments are applied
 * oldest-lot-first. A lot is overdue once its due date has passed and it
 * still has an unpaid remainder — so a customer with several credit sales can
 * have some overdue and some not, which is how real AR aging works and is
 * more correct than treating the whole balance as one age bucket.
 *
 * This function is pure and has no knowledge of SQL, HTTP, or Claude — it is
 * exactly the kind of "deterministic application code" the product brief
 * requires balances to come from, independent of anything AI-generated.
 */
export function computeCustomerAccounting(
  entries: LedgerEntry[],
  config: AccountingConfig,
  asOf: string
): CustomerAccountingResult {
  const live = entries.filter((e) => !e.voided);

  const creditSales = live
    .filter((e) => e.type === "credit_sale")
    .slice()
    .sort(compareDateThenId);
  const payments = live
    .filter((e) => e.type === "payment_received")
    .slice()
    .sort(compareDateThenId);

  const termDays = config.customerPaymentTermsDays ?? config.defaultCreditPeriodDays;

  const lots: CreditLot[] = creditSales.map((e) => ({
    transactionId: e.id,
    occurredOn: e.occurredOn,
    dueDate: e.dueDate ?? addDays(e.occurredOn, termDays),
    originalPaise: e.amountPaise,
    remainingPaise: e.amountPaise,
  }));

  let unallocatedOverpayment = 0;
  for (const payment of payments) {
    let remaining = payment.amountPaise;
    for (const lot of lots) {
      if (remaining <= 0) break;
      if (lot.remainingPaise <= 0) continue;
      const applied = Math.min(lot.remainingPaise, remaining);
      lot.remainingPaise -= applied;
      remaining -= applied;
    }
    if (remaining > 0) unallocatedOverpayment += remaining;
  }

  const totalCreditPaise = creditSales.reduce((sum, e) => sum + e.amountPaise, 0);
  const totalPaymentsPaise = payments.reduce((sum, e) => sum + e.amountPaise, 0);
  const outstandingPaise = totalCreditPaise - totalPaymentsPaise;

  const overdueLots = lots.filter((l) => l.remainingPaise > 0 && l.dueDate < asOf);
  const overdueAmountPaise = overdueLots.reduce((sum, l) => sum + l.remainingPaise, 0);

  let daysOverdue = 0;
  if (overdueLots.length > 0) {
    const oldestDueDate = overdueLots.reduce(
      (oldest, l) => (l.dueDate < oldest ? l.dueDate : oldest),
      overdueLots[0].dueDate
    );
    daysOverdue = Math.max(
      0,
      Math.floor(
        (new Date(asOf + "T00:00:00Z").getTime() - new Date(oldestDueDate + "T00:00:00Z").getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  const allDated = live
    .slice()
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0));
  const lastTransactionDate = allDated.length > 0 ? allDated[0].occurredOn : null;
  const lastPaymentDate = payments.length > 0 ? payments[payments.length - 1].occurredOn : null;

  let status: CustomerLedgerStatus = "paid";
  if (outstandingPaise > 0) {
    status = overdueAmountPaise > 0 ? "overdue" : "pending";
  }

  return {
    totalCreditPaise,
    totalPaymentsPaise,
    outstandingPaise,
    overdueAmountPaise,
    daysOverdue,
    lastTransactionDate,
    lastPaymentDate,
    status,
    lots,
  };
}

/** Today's cash + credit sales, and payments received — for the Overview KPIs. */
export function computeDailyTotals(entries: LedgerEntry[], day: string) {
  const todays = entries.filter((e) => !e.voided && e.occurredOn === day);
  const cashSalesPaise = todays
    .filter((e) => e.type === "cash_sale")
    .reduce((s, e) => s + e.amountPaise, 0);
  const creditSalesPaise = todays
    .filter((e) => e.type === "credit_sale")
    .reduce((s, e) => s + e.amountPaise, 0);
  const paymentsReceivedPaise = todays
    .filter((e) => e.type === "payment_received")
    .reduce((s, e) => s + e.amountPaise, 0);
  return {
    cashSalesPaise,
    creditSalesPaise,
    totalSalesPaise: cashSalesPaise + creditSalesPaise,
    paymentsReceivedPaise,
  };
}
