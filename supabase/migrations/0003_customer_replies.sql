-- Inbound WhatsApp messages and their AI-drafted replies.
--
-- Design notes:
-- * A reminder flows owner -> customer; this table flows customer -> owner.
--   Nothing here is ever auto-sent: a row always starts as a 'draft' that an
--   owner must approve and confirm, exactly like `reminders`.
-- * Rows are created exclusively by the WhatsApp webhook handler using the
--   service-role client (Meta calls that endpoint with no Supabase session at
--   all) — see the "no insert policy" comment below, which mirrors
--   `reminder_delivery_attempts` in 0001_init.sql.
-- * Inbound-message de-duplication reuses the existing generic
--   `webhook_events` table (Meta can redeliver the same webhook), not a new
--   table.

create table customer_replies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id),
  inbound_message_id text not null unique, -- WhatsApp's wamid, for display/debug
  inbound_text text not null,
  inbound_received_at timestamptz not null,
  draft_reply text not null,
  drafted_by text not null check (drafted_by in ('ai', 'template')),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'failed', 'skipped')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_by uuid references auth.users(id),
  sent_at timestamptz,
  provider_message_id text,
  error_detail text,
  idempotency_key text unique, -- guards the outbound send attempt, not the inbound row
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_replies_business_status_idx on customer_replies(business_id, status);

alter table customer_replies enable row level security;

create policy "members can read customer replies"
  on customer_replies for select
  using (is_business_member(business_id));

create policy "members can update customer replies"
  on customer_replies for update
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

-- No insert policy, deliberately: see the file header. The webhook handler's
-- service-role client bypasses RLS to create these rows; safety comes from
-- that handler's own logic (phone match, Gemini guardrails), not from a
-- client-facing insert policy.

create trigger customer_replies_set_updated_at before update on customer_replies
  for each row execute function set_updated_at();
