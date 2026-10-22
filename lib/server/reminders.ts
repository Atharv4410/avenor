import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeCustomerAccounting, type LedgerEntry } from "@/lib/accounting/ledger";
import {
  evaluateReminderEligibility,
  reminderCycleKeyForDate,
  type EligibilityResult,
} from "@/lib/accounting/reminderEligibility";
import { draftReminder } from "@/lib/ai/reminderDrafting";
import { firstNameOf } from "@/lib/server/text";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAttemptIdempotencyKey } from "@/lib/idempotency";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { ApiError } from "@/lib/server/apiHelpers";

async function loadCustomerAndEntries(
  supabase: SupabaseClient<Database>,
  businessId: string,
  customerId: string
) {
  const [{ data: customer, error: customerError }, { data: business, error: businessError }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).eq("business_id", businessId).single(),
      supabase.from("businesses").select("default_credit_period_days").eq("id", businessId).single(),
    ]);
  if (customerError || !customer) throw new ApiError(404, "Customer not found.");
  if (businessError) throw businessError;

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .is("voided_at", null);
  if (txError) throw txError;

  const entries: LedgerEntry[] = (transactions ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amountPaise: t.amount_paise,
    occurredOn: t.occurred_on,
    dueDate: t.due_date,
    voided: false,
  }));

  return { customer, business, entries };
}

export async function checkReminderEligibility(
  supabase: SupabaseClient<Database>,
  businessId: string,
  customerId: string,
  asOf: string
): Promise<EligibilityResult & { accounting: ReturnType<typeof computeCustomerAccounting> }> {
  const { customer, business, entries } = await loadCustomerAndEntries(supabase, businessId, customerId);

  const accounting = computeCustomerAccounting(
    entries,
    {
      defaultCreditPeriodDays: business.default_credit_period_days,
      customerPaymentTermsDays: customer.payment_terms_days,
    },
    asOf
  );

  const lastPaymentEntry = entries
    .filter((e) => e.type === "payment_received")
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))[0];

  const cycleKey = reminderCycleKeyForDate(asOf);
  const { data: existingInCycle } = await supabase
    .from("reminders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("reminder_cycle_key", cycleKey)
    .maybeSingle();

  const { data: lastSent } = await supabase
    .from("reminders")
    .select("updated_at")
    .eq("customer_id", customerId)
    .eq("status", "sent")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = evaluateReminderEligibility({
    accounting,
    now: new Date(asOf),
    lastPaymentAt: lastPaymentEntry ? lastPaymentEntry.occurredOn : null,
    lastReminderSentAt: lastSent?.updated_at ?? null,
    hasReminderInCurrentCycle: Boolean(existingInCycle),
    flaggedForReview: customer.flagged_for_review,
  });

  return { ...result, accounting };
}

export async function draftReminderForCustomer(
  supabase: SupabaseClient<Database>,
  businessId: string,
  customerId: string,
  userId: string
) {
  const asOf = new Date().toISOString().slice(0, 10);
  const { customer } = await loadCustomerAndEntries(supabase, businessId, customerId);
  const eligibility = await checkReminderEligibility(supabase, businessId, customerId, asOf);

  if (!eligibility.eligible) {
    throw new ApiError(422, eligibility.reason ?? "Not eligible for a reminder.");
  }

  const { message, source } = await draftReminder({
    customerFirstName: firstNameOf(customer.name),
    outstandingPaise: eligibility.accounting.outstandingPaise,
    daysOverdue: eligibility.accounting.daysOverdue,
    referenceNumbers: [],
    previousReminderCount: 0,
  });

  const { data: reminder, error } = await supabase
    .from("reminders")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      reminder_cycle_key: reminderCycleKeyForDate(asOf),
      message,
      amount_paise_at_draft: eligibility.accounting.outstandingPaise,
      days_overdue_at_draft: eligibility.accounting.daysOverdue,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: "reminder_drafted",
    description: `Drafted a reminder for ${customer.shop_name} (${source === "gemini" ? "AI-generated" : "template"}).`,
  });

  return { reminder, source };
}

export async function sendReminder(
  supabase: SupabaseClient<Database>,
  businessId: string,
  reminderId: string,
  userId: string,
  clientNonce: string
) {
  const { data: reminder, error: reminderError } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", reminderId)
    .eq("business_id", businessId)
    .single();
  if (reminderError || !reminder) throw new ApiError(404, "Reminder not found.");
  if (reminder.status !== "approved") {
    throw new ApiError(422, "Only approved reminders can be sent.");
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const eligibility = await checkReminderEligibility(supabase, businessId, reminder.customer_id, asOf);
  if (!eligibility.eligible) {
    // Re-checked at send time, not just at draft time — a payment recorded
    // between approval and send must still suppress the send.
    throw new ApiError(422, eligibility.reason ?? "No longer eligible to send.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", reminder.customer_id)
    .single();
  if (customerError || !customer) throw new ApiError(404, "Customer not found.");

  const admin = createAdminClient();
  const idempotencyKey = sendAttemptIdempotencyKey(reminderId, clientNonce);

  const { data: existingAttempt } = await admin
    .from("reminder_delivery_attempts")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingAttempt) {
    return { reminder, attempt: existingAttempt, deduplicated: true };
  }

  const provider = getWhatsAppProvider();
  const result = await provider.sendMessage({ toPhoneE164: customer.phone, message: reminder.message });

  const { data: attempt, error: attemptError } = await admin
    .from("reminder_delivery_attempts")
    .insert({
      reminder_id: reminderId,
      provider: provider.name,
      provider_message_id: result.providerMessageId ?? null,
      status: result.ok ? "sent" : "failed",
      error_detail: result.errorDetail ?? null,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();
  if (attemptError) throw attemptError;

  const { error: updateError } = await supabase
    .from("reminders")
    .update({
      status: result.ok ? "sent" : "failed",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", reminderId);
  if (updateError) throw updateError;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    actor_user_id: userId,
    event_type: result.ok ? "reminder_sent" : "reminder_send_failed",
    description: result.ok
      ? `Reminder sent to ${customer.shop_name} via ${provider.name === "demo" ? "demo mode (simulated)" : "WhatsApp"}.`
      : `Reminder send to ${customer.shop_name} failed: ${result.errorDetail}`,
  });

  return { reminder, attempt, deduplicated: false };
}
