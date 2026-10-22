import type { Transaction, Customer, CustomerWithStats, CustomerStatus } from "./types";

export const OVERDUE_THRESHOLD_DAYS = 5;

let counter = 0;
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumberINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(amount)
  );
}

export function daysAgoISO(referenceNow: string, days: number): string {
  const d = new Date(referenceNow);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function isSameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function daysBetween(earlier: string, later: string): number {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function transactionTypeLabel(type: Transaction["type"]): string {
  switch (type) {
    case "cash_sale":
      return "Cash Sale";
    case "credit_sale":
      return "Credit Sale (Udhaar)";
    case "payment_received":
      return "Payment Received";
  }
}

/**
 * Deterministic financial model:
 * - credit_sale increases outstanding
 * - payment_received decreases outstanding
 * - cash_sale affects sales totals only, never outstanding
 * Every figure here is derived from the transaction list; nothing is hardcoded
 * per customer. See lib/seedData.ts for the only intentionally illustrative
 * headline figures (clearly marked there).
 */
export function computeCustomerStats(
  customer: Customer,
  transactions: Transaction[],
  referenceNow: string
): CustomerWithStats {
  const own = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let outstanding = 0;
  let totalCreditGiven = 0;
  let totalPaymentsReceived = 0;
  let oldestUnpaidCreditDate: string | null = null;
  let runningBalance = 0;

  for (const t of own) {
    if (t.type === "credit_sale") {
      totalCreditGiven += t.amount;
      if (runningBalance <= 0) {
        oldestUnpaidCreditDate = t.date;
      }
      runningBalance += t.amount;
    } else if (t.type === "payment_received") {
      totalPaymentsReceived += t.amount;
      runningBalance -= t.amount;
      if (runningBalance <= 0) {
        oldestUnpaidCreditDate = null;
      }
    }
  }
  outstanding = Math.max(0, Math.round(runningBalance * 100) / 100);

  const lastTransactionDate = own.length > 0 ? own[own.length - 1].date : null;

  let daysOverdue = 0;
  if (outstanding > 0 && oldestUnpaidCreditDate) {
    daysOverdue = Math.max(0, daysBetween(oldestUnpaidCreditDate, referenceNow));
  }

  let status: CustomerStatus = "paid";
  if (outstanding > 0) {
    status = daysOverdue >= OVERDUE_THRESHOLD_DAYS ? "overdue" : "pending";
  }

  return {
    ...customer,
    outstanding,
    totalCreditGiven,
    totalPaymentsReceived,
    lastTransactionDate,
    daysOverdue,
    status,
  };
}

export function getAllCustomerStats(
  customers: Customer[],
  transactions: Transaction[],
  referenceNow: string
): CustomerWithStats[] {
  return customers.map((c) => computeCustomerStats(c, transactions, referenceNow));
}

export type CustomerMatchResult =
  | { kind: "exact"; customer: Customer }
  | { kind: "single"; customer: Customer }
  | { kind: "ambiguous"; candidates: Customer[] }
  | { kind: "none" };

/** Loose name match used by the mock OCR step to link an extracted name to an
 * existing customer. Not fuzzy-scored — just case-insensitive containment —
 * which is enough for the fixed demo dataset and keeps behaviour predictable.
 * Multiple partial matches are reported as "ambiguous" so the UI can flag the
 * row for review instead of silently guessing. */
export function matchCustomer(extractedName: string, customers: Customer[]): CustomerMatchResult {
  const needle = extractedName.trim().toLowerCase();
  if (!needle) return { kind: "none" };

  const exact = customers.find(
    (c) => c.name.toLowerCase() === needle || c.shopName.toLowerCase() === needle
  );
  if (exact) return { kind: "exact", customer: exact };

  const partial = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      needle.includes(c.name.toLowerCase()) ||
      c.shopName.toLowerCase().includes(needle) ||
      needle.includes(c.shopName.toLowerCase())
  );

  if (partial.length === 1) return { kind: "single", customer: partial[0] };
  if (partial.length > 1) return { kind: "ambiguous", candidates: partial };
  return { kind: "none" };
}

export function hasRecentPayment(
  customerId: string,
  transactions: Transaction[],
  referenceNow: string,
  withinHours = 24
): boolean {
  const cutoff = new Date(referenceNow).getTime() - withinHours * 60 * 60 * 1000;
  return transactions.some(
    (t) =>
      t.customerId === customerId &&
      t.type === "payment_received" &&
      new Date(t.date).getTime() >= cutoff
  );
}

/** Splits `total` across `weights.length` buckets proportionally, rounds to the
 * nearest `roundTo`, and corrects the last bucket so the sum is always exact. */
export function splitAmount(
  total: number,
  weights: number[],
  roundTo = 100
): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / weightSum);
  const rounded = raw.map((v) => Math.round(v / roundTo) * roundTo);
  const diff = total - rounded.reduce((a, b) => a + b, 0);
  rounded[rounded.length - 1] += diff;
  return rounded;
}
