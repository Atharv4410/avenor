import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { replySendIdempotencyKey } from "@/lib/idempotency";
import { ApiError } from "@/lib/server/apiHelpers";

export async function editCustomerReply(
  supabase: SupabaseClient<Database>,
  businessId: string,
  replyId: string,
  userId: string,
  message: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from("customer_replies")
    .select("*")
    .eq("id", replyId)
    .eq("business_id", businessId)
    .single();
  if (fetchError || !existing) throw new ApiError(404, "Reply not found.");
  if (existing.status !== "draft" && existing.status !== "approved") {
    throw new ApiError(422, "Only a draft or approved reply can be edited.");
  }

  const { data, error } = await supabase
    .from("customer_replies")
    .update({ draft_reply: message })
    .eq("id", replyId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: "customer_reply_edited",
    description: "Edited a customer reply draft.",
  });

  return data;
}

export async function approveCustomerReply(
  supabase: SupabaseClient<Database>,
  businessId: string,
  replyId: string,
  userId: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from("customer_replies")
    .select("*")
    .eq("id", replyId)
    .eq("business_id", businessId)
    .single();
  if (fetchError || !existing) throw new ApiError(404, "Reply not found.");
  if (existing.status !== "draft") {
    throw new ApiError(422, "Only a draft reply can be approved.");
  }

  const { data, error } = await supabase
    .from("customer_replies")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", replyId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: "customer_reply_approved",
    description: "Approved a customer reply.",
  });

  return data;
}

export async function skipCustomerReply(
  supabase: SupabaseClient<Database>,
  businessId: string,
  replyId: string,
  userId: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from("customer_replies")
    .select("*")
    .eq("id", replyId)
    .eq("business_id", businessId)
    .single();
  if (fetchError || !existing) throw new ApiError(404, "Reply not found.");
  if (existing.status === "sent") {
    throw new ApiError(422, "A sent reply cannot be skipped.");
  }

  const { data, error } = await supabase
    .from("customer_replies")
    .update({ status: "skipped" })
    .eq("id", replyId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: "customer_reply_skipped",
    description: "Skipped a customer reply.",
  });

  return data;
}

export async function sendCustomerReply(
  supabase: SupabaseClient<Database>,
  businessId: string,
  replyId: string,
  userId: string,
  clientNonce: string
) {
  const { data: reply, error: replyError } = await supabase
    .from("customer_replies")
    .select("*")
    .eq("id", replyId)
    .eq("business_id", businessId)
    .single();
  if (replyError || !reply) throw new ApiError(404, "Reply not found.");

  const idempotencyKey = replySendIdempotencyKey(replyId, clientNonce);
  if (reply.idempotency_key === idempotencyKey) {
    // This exact (reply, client nonce) pair already completed a send attempt
    // — a retried request must not call the WhatsApp provider again.
    return { reply, ok: reply.status === "sent", errorDetail: reply.error_detail, deduplicated: true };
  }

  if (reply.status !== "approved") {
    throw new ApiError(422, "Only an approved reply can be sent.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", reply.customer_id)
    .single();
  if (customerError || !customer) throw new ApiError(404, "Customer not found.");

  const provider = getWhatsAppProvider();
  const result = await provider.sendMessage({ toPhoneE164: customer.phone, message: reply.draft_reply });

  const { data: updated, error: updateError } = await supabase
    .from("customer_replies")
    .update({
      status: result.ok ? "sent" : "failed",
      sent_by: userId,
      sent_at: new Date().toISOString(),
      provider_message_id: result.providerMessageId ?? null,
      error_detail: result.errorDetail ?? null,
      idempotency_key: idempotencyKey,
    })
    .eq("id", replyId)
    .select()
    .single();
  if (updateError) throw updateError;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: result.ok ? "customer_reply_sent" : "customer_reply_send_failed",
    description: result.ok
      ? `Reply sent to ${customer.shop_name} via ${provider.name === "demo" ? "demo mode (simulated)" : "WhatsApp"}.`
      : `Reply send to ${customer.shop_name} failed: ${result.errorDetail}`,
  });

  return { reply: updated, ok: result.ok, errorDetail: result.errorDetail, deduplicated: false };
}
