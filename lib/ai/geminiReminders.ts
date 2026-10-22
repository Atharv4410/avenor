import "server-only";
import { GoogleGenAI } from "@google/genai";
import { geminiApiKey } from "@/lib/env";
import { formatPaiseAsINR } from "@/lib/accounting/money";

export interface ReminderContext {
  customerFirstName: string;
  /** Verified by the backend accounting engine — the model never computes
   * or adjusts this. It is interpolated into the prompt as a fixed fact,
   * and the caller re-checks the final message mentions this exact amount
   * before allowing it to be used (see draftReminder below). */
  outstandingPaise: number;
  daysOverdue: number;
  referenceNumbers: string[];
  previousReminderCount: number;
  languagePreference?: "english" | "hindi" | "kannada";
}

const GEMINI_MODEL = "gemini-2.5-flash";

export async function draftReminderMessage(ctx: ReminderContext): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey() });
  const amountText = formatPaiseAsINR(ctx.outstandingPaise);

  const tone =
    ctx.daysOverdue < 10
      ? "gentle, first-touch reminder"
      : ctx.daysOverdue < 18
        ? "polite follow-up, slightly more direct"
        : "respectful but clearly urgent — this has been outstanding a while";

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Customer first name: ${ctx.customerFirstName}
Outstanding amount (use exactly this, do not recompute): ${amountText}
Days overdue: ${ctx.daysOverdue}
Reference numbers, if any: ${ctx.referenceNumbers.join(", ") || "none"}
Previous reminders sent this cycle: ${ctx.previousReminderCount}
Desired tone: ${tone}
Language: ${ctx.languagePreference ?? "english"} (English with common Hindi courtesy words like "Namaste" and "ji" is expected and encouraged for the Indian B2B context)`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: `You draft short WhatsApp payment reminder messages for a small Indian wholesale business following up with shopkeeper customers who buy on credit. Tone must always be respectful and appropriate for an ongoing Indian B2B relationship — never threatening, never aggressive, never implying legal action. Use "Namaste <name> ji" as an opener. The message MUST state the outstanding amount exactly as given — never calculate, round, or alter it. Keep it under 70 words. Output ONLY the message text, nothing else (no preamble, no quotes).`,
      maxOutputTokens: 300,
    },
  });

  const message = (response.text ?? "").trim();
  if (!message) {
    throw new Error("Gemini did not return a reminder message.");
  }

  // Defence in depth: refuse to hand back a draft that doesn't actually
  // contain the verified amount — catches the (rare) case where the model
  // paraphrases or drops the figure instead of quoting it.
  const stripped = amountText.replace(/\s/g, "");
  if (!message.replace(/\s/g, "").includes(stripped)) {
    throw new Error("Drafted reminder did not include the verified outstanding amount; discarding.");
  }

  return message;
}
