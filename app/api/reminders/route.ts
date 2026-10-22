import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { draftReminderForCustomer } from "@/lib/server/reminders";

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ reminders: data });
  } catch (error) {
    return handleApiError(error);
  }
}

const schema = z.object({ customerId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const { customerId } = schema.parse(await request.json());
    const { reminder, source } = await draftReminderForCustomer(supabase, businessId, customerId, userId);
    return NextResponse.json({ reminder, source }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A customerId is required." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
