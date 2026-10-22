import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthedBusiness, handleApiError } from "@/lib/server/apiHelpers";
import { sendReminder } from "@/lib/server/reminders";

const schema = z.object({
  reminderIds: z.array(z.string().uuid()).min(1).max(50),
  /** One nonce for the whole batch click — combined with each reminder id so
   * every attempt still gets its own unique idempotency key. */
  clientNonce: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId, userId } = await requireAuthedBusiness();
    const { reminderIds, clientNonce } = schema.parse(await request.json());

    const results: { reminderId: string; ok: boolean; reason?: string }[] = [];

    for (const reminderId of reminderIds) {
      try {
        await sendReminder(supabase, businessId, reminderId, userId, `${clientNonce}:${reminderId}`);
        results.push({ reminderId, ok: true });
      } catch (err) {
        results.push({
          reminderId,
          ok: false,
          reason: err instanceof Error ? err.message : "Failed to send.",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "reminderIds and clientNonce are required." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
