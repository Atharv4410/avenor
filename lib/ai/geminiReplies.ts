import "server-only";
import { GoogleGenAI } from "@google/genai";
import { geminiApiKey } from "@/lib/env";
import { formatPaiseAsINR } from "@/lib/accounting/money";

export interface ReplyContext {
  customerFirstName: string;
  shopName: string;
  /** Verified by the backend accounting engine, same as reminders — the
   * model never computes this and is told not to state any other figure. */
  outstandingPaise: number;
  daysOverdue: number;
  inboundMessage: string;
}

// See the matching comment in geminiExtraction.ts — "latest" aliases avoid
// hardcoding a version number that gets deprecated for new API keys.
const GEMINI_MODEL = "gemini-flash-lite-latest";

export async function draftCustomerReplyMessage(ctx: ReplyContext): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey() });
  const amountText = formatPaiseAsINR(ctx.outstandingPaise);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Customer first name: ${ctx.customerFirstName}
Shop/business name: ${ctx.shopName}
Current verified outstanding balance (use exactly this if you mention a balance at all — do not recompute or guess): ${amountText}
Days overdue (0 means not overdue): ${ctx.daysOverdue}

The customer's WhatsApp message:
"""
${ctx.inboundMessage}
"""

Draft a short reply from the shop owner's WhatsApp number.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: `You draft a short WhatsApp reply on behalf of a small Indian wholesale business owner, replying to a credit-account customer. This is a DRAFT ONLY — a human owner will read and edit it before anything is sent, so being overly cautious is fine.

Rules, no exceptions:
- Never invent or promise anything the owner didn't say: no discounts, no new due dates, no deals, no commitments about stock or delivery.
- If you state an outstanding balance, state it exactly as given — never a different number, never a recalculation.
- If the customer is asking something you don't have real information for (a specific item, a delivery date, a complaint), write a brief, polite acknowledgement and say the owner will follow up personally — do not make up an answer.
- Tone: warm, respectful, appropriate for an ongoing Indian B2B relationship. "Namaste <name> ji" style is welcome but not required for every message.
- Keep it under 60 words. Output ONLY the reply text, nothing else (no preamble, no quotes, no explanation).`,
      maxOutputTokens: 300,
    },
  });

  const message = (response.text ?? "").trim();
  if (!message) {
    throw new Error("Gemini did not return a reply message.");
  }
  return message;
}
