import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { rupeesToPaise } from "@/lib/accounting/money";
import { hashString } from "@/lib/idempotency";

const schema = z.object({
  amountRupees: z.number().positive(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.string().max(50).nullable().optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  /** Client-supplied nonce so a retried submit (double-click, network retry)
   * can't record the same payment twice. */
  clientRequestId: z.string().min(1).max(200),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const body = schema.parse(await request.json());

    const idempotencyKey = hashString(`payment:${params.id}:${body.clientRequestId}`);

    const { data, error } = await supabase.rpc("record_payment", {
      p_business_id: businessId,
      p_customer_id: params.id,
      p_amount_paise: rupeesToPaise(body.amountRupees),
      p_occurred_on: body.occurredOn,
      p_payment_method: body.paymentMethod ?? null,
      p_reference_number: body.referenceNumber ?? null,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;

    return NextResponse.json({ transactionId: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
