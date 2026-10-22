import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { geminiApiKey } from "@/lib/env";

/**
 * Structured output for one row the model believes it found on the page.
 * `amountRupees` is a plain decimal rupee value from the model — it is
 * converted to integer paise by the caller, and is NEVER written to the
 * ledger without the owner reviewing and confirming it first (see
 * app/api/ledger/confirm/route.ts). The model never computes a balance; it
 * only transcribes what it can see.
 */
export const ExtractedRowSchema = z.object({
  customerNameRaw: z.string().min(1).max(200),
  transactionType: z.enum(["cash_sale", "credit_sale", "payment_received"]),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("ISO date if legible on the page, else null"),
  description: z.string().max(300).default(""),
  quantity: z.number().nullable().optional(),
  unit: z.string().max(30).nullable().optional(),
  amountRupees: z.number().positive().nullable().describe("null if the amount is illegible"),
  referenceNumber: z.string().max(100).nullable().optional(),
  needsReview: z.boolean().describe("true if ANY field is uncertain, illegible, or ambiguous"),
  reviewNote: z.string().max(300).nullable().describe("why needsReview is true, in plain language"),
});

export type ExtractedRow = z.infer<typeof ExtractedRowSchema>;

const ExtractionResponseSchema = z.object({
  rows: z.array(ExtractedRowSchema).max(100),
  pageNote: z.string().max(500).nullable().optional(),
});

export interface GeminiExtractionResult {
  rows: ExtractedRow[];
  pageNote: string | null;
  model: string;
}

const GEMINI_MODEL = "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          customerNameRaw: { type: Type.STRING },
          transactionType: {
            type: Type.STRING,
            enum: ["cash_sale", "credit_sale", "payment_received"],
          },
          occurredOn: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          unit: { type: Type.STRING, nullable: true },
          amountRupees: { type: Type.NUMBER, nullable: true },
          referenceNumber: { type: Type.STRING, nullable: true },
          needsReview: { type: Type.BOOLEAN },
          reviewNote: { type: Type.STRING, nullable: true },
        },
        required: [
          "customerNameRaw",
          "transactionType",
          "occurredOn",
          "description",
          "amountRupees",
          "needsReview",
          "reviewNote",
        ],
      },
    },
    pageNote: { type: Type.STRING, nullable: true },
  },
  required: ["rows"],
};

/**
 * Calls Gemini's vision model to transcribe a photographed ledger page into
 * structured rows, using `responseSchema` (JSON mode) so the output is
 * schema-shaped. Schema-constrained output reduces malformed JSON, it does
 * not guarantee the *values* are sane (the model could still put a
 * hallucinated guess in a field instead of null), so the response is
 * re-validated with Zod regardless of the schema constraint.
 *
 * Critical accounting rule enforced by the caller, not here: this function
 * only ever returns candidate rows for human review. Nothing it returns is
 * written to the ledger directly.
 */
export async function extractLedgerRowsFromImage(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  knownCustomerNames: string[];
}): Promise<GeminiExtractionResult> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey() });

  const knownNamesBlock =
    params.knownCustomerNames.length > 0
      ? `Known existing customers for this business (match against these names/shop names when the handwriting matches, but still transcribe exactly what you see in customerNameRaw — matching happens downstream): ${params.knownCustomerNames.join(", ")}.`
      : "";

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: params.mediaType, data: params.imageBase64 } },
          { text: "Transcribe every transaction row visible on this ledger page." },
        ],
      },
    ],
    config: {
      systemInstruction: `You transcribe photographs of handwritten ledger pages and receipts for a small Indian wholesale business (spices, dry fruits, general wholesale goods). You NEVER calculate running balances, totals, or who owes what — you only transcribe what is written on the page, row by row. If an amount, date, or name is unclear, illegible, or you are guessing, you MUST set needsReview=true and explain why in reviewNote, and set the field to null if you cannot read it rather than inventing a plausible-looking value. Dates may be written in DD/MM/YYYY (common in India) — convert to ISO YYYY-MM-DD, and set needsReview=true if the format is ambiguous. Entries may be in English, Hindi, or Kannada, or a mix, including words like "udhaar" or "baaki" for credit sales. ${knownNamesBlock}`,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return any extraction output.");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Gemini's extraction output was not valid JSON.");
  }

  const parsed = ExtractionResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Gemini's extraction output failed validation: ${parsed.error.message}`);
  }

  return {
    rows: parsed.data.rows,
    pageNote: parsed.data.pageNote ?? null,
    model: GEMINI_MODEL,
  };
}
