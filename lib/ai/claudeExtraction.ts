import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropicApiKey } from "@/lib/env";

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

export interface ClaudeExtractionResult {
  rows: ExtractedRow[];
  pageNote: string | null;
  model: string;
}

const EXTRACTION_TOOL_NAME = "record_ledger_rows";

/**
 * Calls Claude's vision model to transcribe a photographed ledger page into
 * structured rows. Uses tool-use (function calling) so the model's response
 * is schema-shaped, and then re-validates with Zod server-side regardless —
 * schema-constrained output reduces malformed JSON, it does not guarantee
 * the *values* are sane (e.g. the model could still put "unknown" in a date
 * field if it hallucinates past the schema), so we never skip the second
 * validation pass.
 *
 * Critical accounting rule enforced by the caller, not here: this function
 * only ever returns candidate rows for human review. Nothing it returns is
 * written to the ledger directly.
 */
export async function extractLedgerRowsFromImage(params: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  knownCustomerNames: string[];
}): Promise<ClaudeExtractionResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey() });
  const model = "claude-opus-4-5";

  const knownNamesBlock =
    params.knownCustomerNames.length > 0
      ? `Known existing customers for this business (match against these names/shop names when the handwriting matches, but still transcribe exactly what you see in customerNameRaw — matching happens downstream): ${params.knownCustomerNames.join(", ")}.`
      : "";

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: `You transcribe photographs of handwritten ledger pages and receipts for a small Indian wholesale business (spices, dry fruits, general wholesale goods). You NEVER calculate running balances, totals, or who owes what — you only transcribe what is written on the page, row by row. If an amount, date, or name is unclear, illegible, or you are guessing, you MUST set needsReview=true and explain why in reviewNote, and set the field to null if you cannot read it rather than inventing a plausible-looking value. Dates may be written in DD/MM/YYYY (common in India) — convert to ISO YYYY-MM-DD, and set needsReview=true if the format is ambiguous. Entries may be in English, Hindi, or Kannada, or a mix, including words like "udhaar" or "baaki" for credit sales. ${knownNamesBlock}`,
    tools: [
      {
        name: EXTRACTION_TOOL_NAME,
        description: "Record the transcribed ledger rows found on the page.",
        input_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  customerNameRaw: { type: "string" },
                  transactionType: {
                    type: "string",
                    enum: ["cash_sale", "credit_sale", "payment_received"],
                  },
                  occurredOn: { type: ["string", "null"] },
                  description: { type: "string" },
                  quantity: { type: ["number", "null"] },
                  unit: { type: ["string", "null"] },
                  amountRupees: { type: ["number", "null"] },
                  referenceNumber: { type: ["string", "null"] },
                  needsReview: { type: "boolean" },
                  reviewNote: { type: ["string", "null"] },
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
            pageNote: { type: ["string", "null"] },
          },
          required: ["rows"],
        },
      },
    ],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: "Transcribe every transaction row visible on this ledger page.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME
  );

  if (!toolUse) {
    throw new Error("Claude did not return structured extraction output.");
  }

  const parsed = ExtractionResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Claude's extraction output failed validation: ${parsed.error.message}`);
  }

  return {
    rows: parsed.data.rows,
    pageNote: parsed.data.pageNote ?? null,
    model,
  };
}
