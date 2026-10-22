import { describe, it, expect } from "vitest";
import { evaluateReminderEligibility, DEFAULT_REMINDER_RULES } from "./reminderEligibility";
import { computeCustomerAccounting, type LedgerEntry } from "./ledger";

const CONFIG = { defaultCreditPeriodDays: 5 };
const NOW = new Date("2026-10-20T12:00:00Z");

function overdueAccounting(amountPaise: number, occurredOn: string) {
  const entries: LedgerEntry[] = [
    { id: "c1", type: "credit_sale", amountPaise, occurredOn, voided: false, dueDate: null },
  ];
  return computeCustomerAccounting(entries, CONFIG, "2026-10-20");
}

describe("evaluateReminderEligibility", () => {
  it("7. zero-balance customers are excluded from reminders", () => {
    const accounting = computeCustomerAccounting([], CONFIG, "2026-10-20");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: null,
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: false,
      flaggedForReview: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/no outstanding/i);
  });

  it("8. a payment recorded within 24 hours suppresses the reminder", () => {
    const accounting = overdueAccounting(500000, "2026-10-01"); // well overdue
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: new Date(NOW.getTime() - 2 * 3.6e6).toISOString(), // 2h ago
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: false,
      flaggedForReview: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/payment was recorded/i);
  });

  it("allows sending once the 24h payment-suppression window has passed", () => {
    const accounting = overdueAccounting(500000, "2026-10-01");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: new Date(NOW.getTime() - 30 * 3.6e6).toISOString(), // 30h ago
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: false,
      flaggedForReview: false,
    });
    expect(result.eligible).toBe(true);
  });

  it("blocks a duplicate reminder in the same cycle", () => {
    const accounting = overdueAccounting(500000, "2026-10-01");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: null,
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: true,
      flaggedForReview: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/already exists/i);
  });

  it("enforces the minimum gap between sent reminders", () => {
    const accounting = overdueAccounting(500000, "2026-10-01");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: null,
      lastReminderSentAt: new Date(NOW.getTime() - 1 * 8.64e7).toISOString(), // 1 day ago
      hasReminderInCurrentCycle: false,
      flaggedForReview: false,
      rules: { ...DEFAULT_REMINDER_RULES, maxReminderFrequencyDays: 3 },
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/minimum gap/i);
  });

  it("blocks accounts flagged for manual review", () => {
    const accounting = overdueAccounting(500000, "2026-10-01");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: null,
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: false,
      flaggedForReview: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/flagged for manual review/i);
  });

  it("allows a reminder for an eligible overdue customer with no history", () => {
    const accounting = overdueAccounting(500000, "2026-10-01");
    const result = evaluateReminderEligibility({
      accounting,
      now: NOW,
      lastPaymentAt: null,
      lastReminderSentAt: null,
      hasReminderInCurrentCycle: false,
      flaggedForReview: false,
    });
    expect(result.eligible).toBe(true);
  });
});
