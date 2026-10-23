import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySubscriptionChallenge, verifyWebhookSignature } from "@/lib/whatsapp/webhookVerification";
import { isWhatsAppConfigured } from "@/lib/env";
import { phoneNumbersMatch } from "@/lib/server/phoneMatching";
import { computeCustomerAccounting, type LedgerEntry } from "@/lib/accounting/ledger";
import { draftCustomerReply } from "@/lib/ai/replyDrafting";
import { firstNameOf } from "@/lib/server/text";

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

interface WhatsAppInboundMessage {
  id: string; // wamid
  from: string; // sender's wa_id (digits, usually with country code)
  timestamp: string; // unix seconds, as a string
  type: string;
  text?: { body: string };
}

/**
 * An inbound customer message becomes an AI-drafted reply, held for owner
 * approval — never auto-sent. See `customer_replies` in
 * supabase/migrations/0003_customer_replies.sql and the "WhatsApp Reminders"
 * section of the project overview doc.
 *
 * The admin (service-role) client is required here for the same reason as
 * the rest of this handler: Meta calls this endpoint with no Supabase
 * session, so there is no `auth.uid()` for RLS to check against.
 */
async function handleInboundMessage(
  admin: ReturnType<typeof createAdminClient>,
  message: WhatsAppInboundMessage
) {
  if (message.type !== "text" || !message.text?.body) {
    // Only plain text is auto-drafted for now; other message types (image,
    // audio, location, …) are left for the owner to see directly in
    // WhatsApp rather than guessing at a reply.
    return;
  }

  const { data: customers, error: customersError } = await admin
    .from("customers")
    .select("id, business_id, name, shop_name, phone")
    .neq("phone", "");
  if (customersError) {
    console.error("Failed to look up customers for inbound WhatsApp message:", customersError);
    return;
  }

  const matches = (customers ?? []).filter((c) => phoneNumbersMatch(message.from, c.phone));
  if (matches.length !== 1) {
    // No match, or the same number is on file for more than one business —
    // either way there's no single safe business to attribute this to, so
    // this is left for the owner to see directly in WhatsApp rather than
    // guessed at.
    console.warn(
      `Inbound WhatsApp message from ${message.from} matched ${matches.length} customer(s); skipping auto-draft.`
    );
    return;
  }
  const customer = matches[0];

  const [{ data: business, error: businessError }, { data: transactions, error: txError }] = await Promise.all([
    admin.from("businesses").select("default_credit_period_days").eq("id", customer.business_id).single(),
    admin
      .from("transactions")
      .select("*")
      .eq("business_id", customer.business_id)
      .eq("customer_id", customer.id)
      .is("voided_at", null),
  ]);
  if (businessError || !business) {
    console.error("Failed to load business for inbound WhatsApp reply:", businessError);
    return;
  }
  if (txError) {
    console.error("Failed to load transactions for inbound WhatsApp reply:", txError);
    return;
  }

  const entries: LedgerEntry[] = (transactions ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amountPaise: t.amount_paise,
    occurredOn: t.occurred_on,
    dueDate: t.due_date,
    voided: false,
  }));
  const asOf = new Date().toISOString().slice(0, 10);
  const accounting = computeCustomerAccounting(
    entries,
    { defaultCreditPeriodDays: business.default_credit_period_days },
    asOf
  );

  const { message: draftReply, source } = await draftCustomerReply({
    customerFirstName: firstNameOf(customer.name),
    shopName: customer.shop_name,
    outstandingPaise: accounting.outstandingPaise,
    daysOverdue: accounting.daysOverdue,
    inboundMessage: message.text.body,
  });

  const { error: insertError } = await admin.from("customer_replies").insert({
    business_id: customer.business_id,
    customer_id: customer.id,
    inbound_message_id: message.id,
    inbound_text: message.text.body,
    inbound_received_at: new Date(Number(message.timestamp) * 1000).toISOString(),
    draft_reply: draftReply,
    drafted_by: source === "ai" ? "ai" : "template",
    status: "draft",
  });
  if (insertError) {
    if (insertError.code === "23505") return; // already drafted for this message id
    console.error("Failed to save drafted customer reply:", insertError);
    return;
  }

  await admin.from("activity_events").insert({
    business_id: customer.business_id,
    event_type: "customer_reply_drafted",
    description: `Drafted a reply to ${customer.shop_name}'s WhatsApp message (${
      source === "ai" ? "AI-generated" : "template"
    }).`,
  });
}

/**
 * Delivery/read/failure status callbacks, and inbound customer messages. No
 * Supabase auth session exists here — Meta is calling us directly — so this
 * is the one legitimate use of the service-role client. Every event is
 * deduplicated through `webhook_events` before it is allowed to touch
 * `reminder_delivery_attempts` or draft a reply, because Meta explicitly
 * documents that the same webhook can be delivered more than once.
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

  const messages: WhatsAppInboundMessage[] =
    payload?.entry?.flatMap((entry: any) =>
      entry?.changes?.flatMap((change: any) => change?.value?.messages ?? []) ?? []
    ) ?? [];

  for (const message of messages) {
    const externalEventId = `msg:${message.id}`;

    const { error: dedupeError } = await admin.from("webhook_events").insert({
      provider: "whatsapp",
      external_event_id: externalEventId,
      payload: message as unknown as Record<string, unknown>,
    });

    if (dedupeError) {
      if (dedupeError.code === "23505") continue; // already processed this message
      console.error("Failed to record inbound webhook event:", dedupeError);
      continue;
    }

    try {
      await handleInboundMessage(admin, message);
    } catch (err) {
      console.error("Failed to process inbound WhatsApp message:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
