import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";

const schema = z.object({ reminderIds: z.array(z.string().uuid()).min(1).max(100) });

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const { reminderIds } = schema.parse(await request.json());

    const { data, error } = await supabase
      .from("reminders")
      .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
      .in("id", reminderIds)
      .eq("business_id", businessId)
      .eq("status", "draft")
      .select();
    if (error) throw error;

    if ((data ?? []).length > 0) {
      await supabase.from("activity_events").insert({
        business_id: businessId,
        actor_user_id: userId,
        event_type: "reminder_approved",
        description: `Approved ${data!.length} reminder(s).`,
      });
    }

    return NextResponse.json({ approved: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "reminderIds is required." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
