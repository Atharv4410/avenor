import type { CustomerAccountingResult } from "./ledger";

export interface ReminderRules {
  /** No reminder until a lot has been overdue at least this many days. */
  minOverdueDaysBeforeFirstReminder: number;
  /** Minimum days between two *sent* reminders to the same customer. */
  maxReminderFrequencyDays: number;
  /** Suppress sending if a payment was recorded within this many hours. */
  paymentSuppressionHours: number;
}

export const DEFAULT_REMINDER_RULES: ReminderRules = {
  minOverdueDaysBeforeFirstReminder: 1,
  maxReminderFrequencyDays: 3,
  paymentSuppressionHours: 24,
};

export interface ReminderEligibilityInput {
  accounting: CustomerAccountingResult;
  now: Date;
  /** ISO timestamp of the customer's most recent recorded payment, if any. */
  lastPaymentAt: string | null;
  /** ISO timestamp the last *sent* reminder went out, if any. */
  lastReminderSentAt: string | null;
  /** True if an existing reminder (any status) already exists for this
   * customer in the current reminder cycle — prevents duplicate drafts. */
  hasReminderInCurrentCycle: boolean;
  /** True if the account is flagged under manual reconciliation review. */
  flaggedForReview: boolean;
  rules?: ReminderRules;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Every rule here must also be enforced server-side at the point of drafting
 * and at the point of sending — this function is called from both places so
 * there is exactly one source of truth, not a UI-only check a client could
 * bypass by calling the API directly.
 */
export function evaluateReminderEligibility(input: ReminderEligibilityInput): EligibilityResult {
  const rules = input.rules ?? DEFAULT_REMINDER_RULES;

  if (input.accounting.outstandingPaise <= 0) {
    return { eligible: false, reason: "Customer has no outstanding balance." };
  }

  if (input.flaggedForReview) {
    return { eligible: false, reason: "Account is flagged for manual review." };
  }

  if (input.accounting.overdueAmountPaise <= 0) {
    return { eligible: false, reason: "No overdue amount yet." };
  }

  if (input.accounting.daysOverdue < rules.minOverdueDaysBeforeFirstReminder) {
    return {
      eligible: false,
      reason: `Overdue for only ${input.accounting.daysOverdue} day(s); minimum is ${rules.minOverdueDaysBeforeFirstReminder}.`,
    };
  }

  if (input.hasReminderInCurrentCycle) {
    return { eligible: false, reason: "A reminder already exists for this cycle." };
  }

  if (input.lastPaymentAt) {
    const hoursSincePayment = (input.now.getTime() - new Date(input.lastPaymentAt).getTime()) / 3.6e6;
    if (hoursSincePayment < rules.paymentSuppressionHours) {
      return {
        eligible: false,
        reason: `A payment was recorded ${hoursSincePayment.toFixed(1)}h ago (suppressed for ${rules.paymentSuppressionHours}h).`,
      };
    }
  }

  if (input.lastReminderSentAt) {
    const daysSinceLastReminder =
      (input.now.getTime() - new Date(input.lastReminderSentAt).getTime()) / 8.64e7;
    if (daysSinceLastReminder < rules.maxReminderFrequencyDays) {
      return {
        eligible: false,
        reason: `Last reminder sent ${daysSinceLastReminder.toFixed(1)} day(s) ago (minimum gap is ${rules.maxReminderFrequencyDays}).`,
      };
    }
  }

  return { eligible: true };
}

/** A stable key identifying "which reminder cycle" a given day falls into —
 * one reminder per customer per cycle. A simple daily cycle keeps the rule
 * easy to reason about and test; businesses that want weekly cadences can
 * widen this later without touching the eligibility logic above. */
export function reminderCycleKeyForDate(iso: string): string {
  return iso.slice(0, 10);
}
