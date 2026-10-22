import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeCustomerAccounting, type LedgerEntry } from "@/lib/accounting/ledger";

export interface CustomerWithAccounting {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  isWalkIn: boolean;
  flaggedForReview: boolean;
  paymentTermsDays: number | null;
  totalCreditPaise: number;
  totalPaymentsPaise: number;
  outstandingPaise: number;
  overdueAmountPaise: number;
  daysOverdue: number;
  lastTransactionDate: string | null;
  lastPaymentDate: string | null;
  status: "paid" | "pending" | "overdue";
}

/**
 * Fetches every customer and every non-voided transaction for a business in
 * two queries, then runs the deterministic accounting engine in memory per
 * customer. This is the same architecture the prototype used (SQL for
 * storage/authorization, TypeScript for the accounting algorithm) — it keeps
 * the FIFO/aging logic unit-testable without a database, see
 * lib/accounting/ledger.test.ts.
 */
export async function listCustomersWithAccounting(
  supabase: SupabaseClient<Database>,
  businessId: string,
  asOf: string
): Promise<CustomerWithAccounting[]> {
  const [{ data: customers, error: customersError }, { data: businessRow, error: businessError }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("business_id", businessId),
      supabase
        .from("businesses")
        .select("default_credit_period_days")
        .eq("id", businessId)
        .single(),
    ]);

  if (customersError) throw customersError;
  if (businessError) throw businessError;

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .is("voided_at", null);

  if (txError) throw txError;

  const byCustomer = new Map<string, LedgerEntry[]>();
  for (const t of transactions ?? []) {
    const entry: LedgerEntry = {
      id: t.id,
      type: t.type,
      amountPaise: t.amount_paise,
      occurredOn: t.occurred_on,
      dueDate: t.due_date,
      voided: Boolean(t.voided_at),
    };
    const list = byCustomer.get(t.customer_id) ?? [];
    list.push(entry);
    byCustomer.set(t.customer_id, list);
  }

  return (customers ?? []).map((c) => {
    const entries = byCustomer.get(c.id) ?? [];
    const accounting = computeCustomerAccounting(
      entries,
      {
        defaultCreditPeriodDays: businessRow.default_credit_period_days,
        customerPaymentTermsDays: c.payment_terms_days,
      },
      asOf
    );
    return {
      id: c.id,
      name: c.name,
      shopName: c.shop_name,
      phone: c.phone,
      isWalkIn: c.is_walk_in,
      flaggedForReview: c.flagged_for_review,
      paymentTermsDays: c.payment_terms_days,
      ...accounting,
    };
  });
}

export async function createCustomer(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: { name: string; shopName: string; phone: string; paymentTermsDays?: number | null }
) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      shop_name: input.shopName.trim(),
      phone: input.phone.trim(),
      payment_terms_days: input.paymentTermsDays ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("activity_events").insert({
    business_id: businessId,
    event_type: "customer_added",
    description: `Added customer ${input.shopName}.`,
  });

  return data;
}
