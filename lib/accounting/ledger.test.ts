import { describe, it, expect } from "vitest";
import { computeCustomerAccounting, computeDailyTotals, type LedgerEntry } from "./ledger";

const CONFIG = { defaultCreditPeriodDays: 5 };

function entry(partial: Partial<LedgerEntry> & Pick<LedgerEntry, "type" | "amountPaise" | "occurredOn">): LedgerEntry {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    voided: false,
    dueDate: null,
    ...partial,
  };
}

describe("computeCustomerAccounting", () => {
  it("1. a credit sale increases outstanding", () => {
    const result = computeCustomerAccounting(
      [entry({ type: "credit_sale", amountPaise: 500000, occurredOn: "2026-10-01" })],
      CONFIG,
      "2026-10-01"
    );
    expect(result.outstandingPaise).toBe(500000);
    expect(result.totalCreditPaise).toBe(500000);
  });

  it("2. a payment decreases outstanding", () => {
    const result = computeCustomerAccounting(
      [
        entry({ type: "credit_sale", amountPaise: 500000, occurredOn: "2026-10-01" }),
        entry({ type: "payment_received", amountPaise: 200000, occurredOn: "2026-10-03" }),
      ],
      CONFIG,
      "2026-10-03"
    );
    expect(result.outstandingPaise).toBe(300000);
  });

  it("3. a cash sale does not increase credit outstanding", () => {
    const result = computeCustomerAccounting(
      [entry({ type: "cash_sale", amountPaise: 150000, occurredOn: "2026-10-01" })],
      CONFIG,
      "2026-10-01"
    );
    expect(result.outstandingPaise).toBe(0);
    expect(result.status).toBe("paid");
  });

  it("4. partial payments calculate correctly across multiple credit sales (FIFO)", () => {
    const result = computeCustomerAccounting(
      [
        entry({ id: "c1", type: "credit_sale", amountPaise: 300000, occurredOn: "2026-10-01" }),
        entry({ id: "c2", type: "credit_sale", amountPaise: 200000, occurredOn: "2026-10-05" }),
        entry({ id: "p1", type: "payment_received", amountPaise: 350000, occurredOn: "2026-10-10" }),
      ],
      CONFIG,
      "2026-10-10"
    );
    // ₹3,000 (c1) fully paid, ₹500 of c2's ₹2,000 paid -> ₹1,500 remains on c2
    expect(result.outstandingPaise).toBe(150000);
    const c1 = result.lots.find((l) => l.transactionId === "c1")!;
    const c2 = result.lots.find((l) => l.transactionId === "c2")!;
    expect(c1.remainingPaise).toBe(0);
    expect(c2.remainingPaise).toBe(150000);
  });

  it("5. overpayments do not produce false overdue balances", () => {
    const result = computeCustomerAccounting(
      [
        entry({ id: "c1", type: "credit_sale", amountPaise: 100000, occurredOn: "2026-09-01" }),
        entry({ id: "p1", type: "payment_received", amountPaise: 150000, occurredOn: "2026-09-02" }),
      ],
      CONFIG,
      "2026-10-20" // long after the credit sale's due date
    );
    expect(result.outstandingPaise).toBe(-50000); // customer is in credit
    expect(result.overdueAmountPaise).toBe(0);
    expect(result.daysOverdue).toBe(0);
    expect(result.status).toBe("paid");
  });

  it("ages lots independently: an older unpaid lot is overdue while a newer one is not", () => {
    const result = computeCustomerAccounting(
      [
        entry({ id: "old", type: "credit_sale", amountPaise: 100000, occurredOn: "2026-10-01" }), // due 10-06
        entry({ id: "new", type: "credit_sale", amountPaise: 50000, occurredOn: "2026-10-18" }), // due 10-23
      ],
      CONFIG,
      "2026-10-20"
    );
    expect(result.overdueAmountPaise).toBe(100000);
    expect(result.outstandingPaise).toBe(150000);
    expect(result.status).toBe("overdue");
  });

  it("respects an explicit due date over the default credit period", () => {
    const result = computeCustomerAccounting(
      [
        entry({
          id: "c1",
          type: "credit_sale",
          amountPaise: 100000,
          occurredOn: "2026-10-01",
          dueDate: "2026-10-25",
        }),
      ],
      CONFIG,
      "2026-10-10" // past the default +5d window, but before the explicit due date
    );
    expect(result.status).toBe("pending");
    expect(result.overdueAmountPaise).toBe(0);
  });

  it("respects a customer-level payment-terms override", () => {
    const result = computeCustomerAccounting(
      [entry({ type: "credit_sale", amountPaise: 100000, occurredOn: "2026-10-01" })],
      { ...CONFIG, customerPaymentTermsDays: 30 },
      "2026-10-10"
    );
    expect(result.status).toBe("pending");
  });

  it("excludes voided transactions from every total", () => {
    const result = computeCustomerAccounting(
      [
        entry({ type: "credit_sale", amountPaise: 500000, occurredOn: "2026-10-01" }),
        entry({ type: "credit_sale", amountPaise: 999999, occurredOn: "2026-10-02", voided: true }),
      ],
      CONFIG,
      "2026-10-02"
    );
    expect(result.totalCreditPaise).toBe(500000);
  });
});

describe("computeDailyTotals", () => {
  it("sums cash, credit, and payments for a single day only", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "cash_sale", amountPaise: 100000, occurredOn: "2026-10-22" }),
      entry({ type: "credit_sale", amountPaise: 200000, occurredOn: "2026-10-22" }),
      entry({ type: "payment_received", amountPaise: 50000, occurredOn: "2026-10-22" }),
      entry({ type: "cash_sale", amountPaise: 999999, occurredOn: "2026-10-21" }), // different day
    ];
    const totals = computeDailyTotals(entries, "2026-10-22");
    expect(totals.cashSalesPaise).toBe(100000);
    expect(totals.creditSalesPaise).toBe(200000);
    expect(totals.totalSalesPaise).toBe(300000);
    expect(totals.paymentsReceivedPaise).toBe(50000);
  });
});
