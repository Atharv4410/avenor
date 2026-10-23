import { NextResponse } from "next/server";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { data, error } = await supabase
      .from("customer_replies")
      .select("*")
      .eq("business_id", businessId)
      .order("inbound_received_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ customerReplies: data });
  } catch (error) {
    return handleApiError(error);
  }
}
