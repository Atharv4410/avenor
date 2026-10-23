import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { editCustomerReply, approveCustomerReply, skipCustomerReply } from "@/lib/server/customerReplies";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), message: z.string().min(1).max(1000) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("skip") }),
]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const body = schema.parse(await request.json());

    if (body.action === "edit") {
      const reply = await editCustomerReply(supabase, businessId, params.id, userId, body.message);
      return NextResponse.json({ customerReply: reply });
    }
    if (body.action === "approve") {
      const reply = await approveCustomerReply(supabase, businessId, params.id, userId);
      return NextResponse.json({ customerReply: reply });
    }
    const reply = await skipCustomerReply(supabase, businessId, params.id, userId);
    return NextResponse.json({ customerReply: reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
