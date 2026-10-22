import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError, ApiError } from "@/lib/server/apiHelpers";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), message: z.string().min(1).max(1000) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("skip") }),
]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const body = schema.parse(await request.json());

    const { data: existing, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", params.id)
      .eq("business_id", businessId)
      .single();
    if (fetchError || !existing) throw new ApiError(404, "Reminder not found.");

    if (body.action === "edit") {
      if (existing.status !== "draft" && existing.status !== "approved") {
        throw new ApiError(422, "Only draft or approved reminders can be edited.");
      }
      const { data, error } = await supabase
        .from("reminders")
        .update({ message: body.message })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("activity_events").insert({
        business_id: businessId,
        actor_user_id: userId,
        event_type: "reminder_edited",
        description: "Edited a reminder message.",
      });
      return NextResponse.json({ reminder: data });
    }

    if (body.action === "approve") {
      if (existing.status !== "draft") {
        throw new ApiError(422, "Only draft reminders can be approved.");
      }
      const { data, error } = await supabase
        .from("reminders")
        .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("activity_events").insert({
        business_id: businessId,
        actor_user_id: userId,
        event_type: "reminder_approved",
        description: "Approved a reminder.",
      });
      return NextResponse.json({ reminder: data });
    }

    // skip
    if (existing.status === "sent") {
      throw new ApiError(422, "A sent reminder cannot be skipped.");
    }
    const { data, error } = await supabase
      .from("reminders")
      .update({ status: "skipped" })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    await supabase.from("activity_events").insert({
      business_id: businessId,
      actor_user_id: userId,
      event_type: "reminder_skipped",
      description: "Skipped a reminder.",
    });
    return NextResponse.json({ reminder: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
