import { NextResponse } from "next/server";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

export async function GET() {
  try {
    const { supabase, businessId } = await requireAuthedBusiness();
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, city, default_credit_period_days")
      .eq("id", businessId)
      .single();
    if (error) throw error;
    return NextResponse.json({ business: data });
  } catch (error) {
    return handleApiError(error);
  }
}
