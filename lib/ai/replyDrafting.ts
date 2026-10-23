import "server-only";
import { isGeminiConfigured } from "@/lib/env";
import { draftCustomerReplyMessage, type ReplyContext } from "./geminiReplies";
import { formatPaiseAsINR } from "@/lib/accounting/money";

export interface ReplyDraftResult {
  message: string;
  /** Surfaced to the UI so a template fallback is never presented as
   * AI-generated — same disclosure rule as reminder drafting. */
  source: "ai" | "template";
}

/** Deterministic, non-AI fallback used only when GEMINI_API_KEY is not
 * configured, so an inbound message still gets a usable (human-reviewed)
 * draft reply instead of silently doing nothing. */
function templateFallback(ctx: ReplyContext): string {
  const amt = formatPaiseAsINR(ctx.outstandingPaise);
  if (ctx.outstandingPaise <= 0) {
    return `Namaste ${ctx.customerFirstName} ji, thanks for your message! Your account is fully settled right now. We'll get back to you shortly about anything else.`;
  }
  return `Namaste ${ctx.customerFirstName} ji, thanks for your message! Your current outstanding balance with us is ${amt}. We'll follow up shortly on anything else you asked.`;
}

export async function draftCustomerReply(ctx: ReplyContext): Promise<ReplyDraftResult> {
  if (!isGeminiConfigured()) {
    return { message: templateFallback(ctx), source: "template" };
  }

  try {
    const message = await draftCustomerReplyMessage(ctx);
    return { message, source: "ai" };
  } catch (err) {
    console.error("Gemini reply drafting failed, using template fallback:", err);
    return { message: templateFallback(ctx), source: "template" };
  }
}
