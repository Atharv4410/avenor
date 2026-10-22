import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

const schema = z.object({ reason: z.string().min(1).max(500) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireAuthedBusiness();
    const { reason } = schema.parse(await request.json());

    const { error } = await supabase.rpc("void_transaction", {
      p_transaction_id: params.id,
      p_reason: reason,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A reason is required to void a transaction." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
