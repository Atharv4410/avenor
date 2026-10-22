import { NextResponse } from "next/server";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ transactions: data });
  } catch (error) {
    return handleApiError(error);
  }
}
