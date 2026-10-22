import { NextResponse } from "next/server";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { data, error } = await supabase
      .from("activity_events")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ activity: data });
  } catch (error) {
    return handleApiError(error);
  }
}
