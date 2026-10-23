import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { sendCustomerReply } from "@/lib/server/customerReplies";

const schema = z.object({ clientNonce: z.string().min(1).max(200) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const { clientNonce } = schema.parse(await request.json());
    const result = await sendCustomerReply(supabase, businessId, params.id, userId, clientNonce);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A clientNonce is required (for safe retries)." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
