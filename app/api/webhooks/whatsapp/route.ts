import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySubscriptionChallenge, verifyWebhookSignature } from "@/lib/whatsapp/webhookVerification";
import { isWhatsAppConfigured } from "@/lib/env";

/** Meta's one-time subscription handshake. */
export async function GET(request: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "WhatsApp integration not configured." }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const challenge = verifySubscriptionChallenge({
    mode: searchParams.get("hub.mode"),
    verifyToken: searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
  });

  if (challenge === null) {
    return NextResponse.json({ error: "Verification failed." }, { status: 403 });
  }
  return new NextResponse(challenge, { status: 200 });
}

interface WhatsAppStatusEntry {
  id: string; // provider message id
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errors?: { title?: string; message?: string }[];
}

/**
 * Delivery/read/failure status callbacks. No Supabase auth session exists
 * here — Meta is calling us directly — so this is the one legitimate use of
 * the service-role client. Every event is deduplicated through
 * `webhook_events` before it is allowed to touch `reminder_delivery_attempts`,
 * because Meta explicitly documents that the same webhook can be delivered
 * more than once.
 */
export async function POST(request: NextRequest) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "WhatsApp integration not configured." }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const admin = createAdminClient();

  const statuses: WhatsAppStatusEntry[] =
    payload?.entry?.flatMap((entry: any) =>
      entry?.changes?.flatMap((change: any) => change?.value?.statuses ?? []) ?? []
    ) ?? [];

  for (const status of statuses) {
    const externalEventId = `${status.id}:${status.status}:${status.timestamp}`;

    const { error: dedupeError } = await admin
      .from("webhook_events")
      .insert({
        provider: "whatsapp",
        external_event_id: externalEventId,
        payload: status as unknown as Record<string, unknown>,
      });

    if (dedupeError) {
      // Unique violation = we've already processed this exact event.
      if (dedupeError.code === "23505") continue;
      console.error("Failed to record webhook event:", dedupeError);
      continue;
    }

    const newStatus = status.status === "failed" ? "failed" : status.status;
    const errorDetail = status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? null;

    const { error: updateError } = await admin
      .from("reminder_delivery_attempts")
      .update({ status: newStatus, error_detail: errorDetail, raw_webhook_payload: status as any })
      .eq("provider_message_id", status.id);

    if (updateError) {
      console.error("Failed to update delivery attempt from webhook:", updateError);
    }
  }

  return NextResponse.json({ ok: true });
}
