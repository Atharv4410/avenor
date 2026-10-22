import "server-only";
import { isAnthropicConfigured } from "@/lib/env";
import { draftReminderMessage, type ReminderContext } from "./claudeReminders";
import { formatPaiseAsINR } from "@/lib/accounting/money";

export interface DraftResult {
  message: string;
  /** Surfaced to the UI so it never claims a template fallback is "AI
   * generated" — see the brief's instruction not to fabricate AI involvement. */
  source: "claude" | "template_fallback";
}

/** Deterministic, non-AI fallback used only when ANTHROPIC_API_KEY is not
 * configured, so the reminder workflow stays usable in local dev without
 * credentials. Never presented to the owner as AI-generated. */
function templateFallback(ctx: ReminderContext): string {
  const amt = formatPaiseAsINR(ctx.outstandingPaise);
  if (ctx.daysOverdue < 10) {
    return `Namaste ${ctx.customerFirstName} ji, hope you are doing well. Just a gentle reminder regarding the pending payment of ${amt}. Please let us know when we can expect the payment. Thank you!`;
  }
  if (ctx.daysOverdue < 18) {
    return `Namaste ${ctx.customerFirstName} ji, this is a follow-up on the outstanding balance of ${amt}, pending for about ${ctx.daysOverdue} days. Could you let us know a suitable date for the payment? Thank you.`;
  }
  return `Namaste ${ctx.customerFirstName} ji, following up on the balance of ${amt}, outstanding for ${ctx.daysOverdue} days. We'd appreciate this being settled at the earliest convenience. Thank you.`;
}

export async function draftReminder(ctx: ReminderContext): Promise<DraftResult> {
  if (!isAnthropicConfigured()) {
    return { message: templateFallback(ctx), source: "template_fallback" };
  }

  try {
    const message = await draftReminderMessage(ctx);
    return { message, source: "claude" };
  } catch (err) {
    // Claude is configured but failed (rate limit, bad response, etc.) — fall
    // back rather than blocking the owner's workflow, but the caller should
    // still surface that this particular draft isn't AI-generated.
    console.error("Claude reminder drafting failed, using template fallback:", err);
    return { message: templateFallback(ctx), source: "template_fallback" };
  }
}
