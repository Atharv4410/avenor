import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { createCustomer } from "@/lib/server/customers";
import { rupeesToPaise } from "@/lib/accounting/money";
import { transactionIdempotencyKey } from "@/lib/idempotency";

const rowSchema = z.object({
  customerId: z.string().uuid().nullable(),
  newCustomerName: z.string().max(200).nullable().optional(),
  type: z.enum(["cash_sale", "credit_sale", "payment_received"]),
  amountRupees: z.number().positive(),
  description: z.string().max(300).default(""),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
});

const schema = z.object({
  ledgerDocumentId: z.string().uuid().nullable(),
  /** Required when ledgerDocumentId is null (pure manual entry), so a
   * retried submit of the same manual batch is still idempotent. */
  batchId: z.string().min(1).max(200),
  rows: z.array(rowSchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const body = schema.parse(await request.json());

    for (const row of body.rows) {
      if (!row.customerId && !row.newCustomerName) {
        return NextResponse.json(
          { error: "Every row needs either an existing customer or a new customer name." },
          { status: 400 }
        );
      }
    }

    // Resolve/create customers first so the RPC call only ever receives real
    // customer ids.
    const resolvedCustomerIds: string[] = [];
    const newCustomerCache = new Map<string, string>();
    for (const row of body.rows) {
      if (row.customerId) {
        resolvedCustomerIds.push(row.customerId);
        continue;
      }
      const key = row.newCustomerName!.trim().toLowerCase();
      if (newCustomerCache.has(key)) {
        resolvedCustomerIds.push(newCustomerCache.get(key)!);
        continue;
      }
      const created = await createCustomer(supabase, businessId, {
        name: row.newCustomerName!.trim(),
        shopName: row.newCustomerName!.trim(),
        phone: "",
      });
      newCustomerCache.set(key, created.id);
      resolvedCustomerIds.push(created.id);
    }

    const rpcRows = body.rows.map((row, index) => {
      const amountPaise = rupeesToPaise(row.amountRupees);
      return {
        customer_id: resolvedCustomerIds[index],
        type: row.type,
        amount_paise: amountPaise,
        description: row.description,
        occurred_on: row.occurredOn,
        due_date: row.dueDate ?? null,
        reference_number: row.referenceNumber ?? null,
        idempotency_key: transactionIdempotencyKey({
          ledgerDocumentId: body.ledgerDocumentId ?? body.batchId,
          rowIndex: index,
          amountPaise,
          type: row.type,
          occurredOn: row.occurredOn,
        }),
      };
    });

    const { data, error } = await supabase.rpc("confirm_ledger_transactions", {
      p_business_id: businessId,
      p_ledger_document_id: body.ledgerDocumentId,
      p_rows: rpcRows,
    });

    if (error) throw error;

    const insertedCount = (data ?? []).filter((r: { inserted: boolean }) => r.inserted).length;
    const duplicateCount = (data ?? []).length - insertedCount;

    return NextResponse.json({ results: data, insertedCount, duplicateCount }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
