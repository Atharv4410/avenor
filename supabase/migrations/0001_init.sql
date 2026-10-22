-- HisaabAI initial schema.
--
-- Design notes (read before changing anything):
-- * All money columns are `bigint` paise (1 rupee = 100 paise). Never store
--   rupees as a float — see lib/accounting/money.ts for the rationale.
-- * Every business-owned table carries `business_id` and has RLS enabled.
--   A user may only touch rows for a business they are a member of
--   (`business_members`). This is enforced here in the database, as a second
--   layer behind the application-level checks in the Next.js route handlers
--   — never rely on only one of the two layers.
-- * Corrections never delete financial history. A transaction can be voided
--   (soft-deleted with an audit trail) but the original row always remains
--   queryable.
-- * Idempotency keys are unique constraints, not application-level checks,
--   so a retried request is safe even under concurrent requests.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Businesses & membership
-- ---------------------------------------------------------------------------

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Bengaluru',
  default_credit_period_days int not null default 5 check (default_credit_period_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_id_idx on business_members(user_id);

-- Helper used by every RLS policy below. `security definer` so it can read
-- business_members regardless of the calling policy's row visibility, but it
-- only ever answers "is this specific user a member of this specific
-- business" — it cannot be used to exfiltrate other rows.
create or replace function is_business_member(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from business_members
    where business_id = p_business_id and user_id = auth.uid()
  );
$$;

alter table businesses enable row level security;
alter table business_members enable row level security;

create policy "members can read their businesses"
  on businesses for select
  using (is_business_member(id));

create policy "authenticated users can create a business"
  on businesses for insert
  with check (auth.uid() is not null);

create policy "owners can update their business"
  on businesses for update
  using (is_business_member(id))
  with check (is_business_member(id));

create policy "members can read their own memberships"
  on business_members for select
  using (user_id = auth.uid() or is_business_member(business_id));

create policy "a user can create their own membership row"
  on business_members for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  shop_name text not null,
  phone text not null default '',
  payment_terms_days int check (payment_terms_days > 0),
  is_walk_in boolean not null default false,
  flagged_for_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_business_id_idx on customers(business_id);

alter table customers enable row level security;

create policy "members can read customers"
  on customers for select
  using (is_business_member(business_id));

create policy "members can insert customers"
  on customers for insert
  with check (is_business_member(business_id));

create policy "members can update customers"
  on customers for update
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- Ledger documents (uploaded photos) & extraction state
-- ---------------------------------------------------------------------------

create table ledger_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references auth.users(id),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'extracted', 'confirmed', 'failed')),
  extraction_result jsonb,
  error_message text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ledger_documents_business_id_idx on ledger_documents(business_id);

alter table ledger_documents enable row level security;

create policy "members can read ledger documents"
  on ledger_documents for select
  using (is_business_member(business_id));

create policy "members can insert ledger documents"
  on ledger_documents for insert
  with check (is_business_member(business_id) and uploaded_by = auth.uid());

create policy "members can update ledger documents"
  on ledger_documents for update
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- Transactions (the authoritative ledger)
-- ---------------------------------------------------------------------------

create table transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id),
  ledger_document_id uuid references ledger_documents(id),
  type text not null check (type in ('cash_sale', 'credit_sale', 'payment_received')),
  amount_paise bigint not null check (amount_paise > 0),
  description text not null default '',
  occurred_on date not null,
  due_date date, -- explicit due date; only meaningful for credit_sale
  reference_number text,
  payment_method text,
  idempotency_key text unique,
  created_by uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint void_requires_reason check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

create index transactions_business_customer_idx on transactions(business_id, customer_id);
create index transactions_business_date_idx on transactions(business_id, occurred_on);
create index transactions_ledger_document_idx on transactions(ledger_document_id);

alter table transactions enable row level security;

create policy "members can read transactions"
  on transactions for select
  using (is_business_member(business_id));

-- Direct client inserts are intentionally NOT allowed for transactions.
-- All writes go through the confirm_ledger_transactions / record_payment /
-- void_transaction functions below, so validation (customer ownership,
-- idempotency, activity logging) cannot be bypassed by calling the table
-- directly from a compromised or buggy client.

create table transaction_line_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  description text not null,
  quantity numeric,
  unit text,
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now()
);

create index transaction_line_items_transaction_idx on transaction_line_items(transaction_id);

alter table transaction_line_items enable row level security;

create policy "members can read line items"
  on transaction_line_items for select
  using (
    exists (
      select 1 from transactions t
      where t.id = transaction_line_items.transaction_id
        and is_business_member(t.business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Reminders & delivery
-- ---------------------------------------------------------------------------

create table reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id),
  reminder_cycle_key text not null, -- see lib/accounting/reminderEligibility.ts
  message text not null,
  amount_paise_at_draft bigint not null check (amount_paise_at_draft > 0),
  days_overdue_at_draft int not null check (days_overdue_at_draft >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'failed', 'skipped')),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, reminder_cycle_key)
);

create index reminders_business_status_idx on reminders(business_id, status);

alter table reminders enable row level security;

create policy "members can read reminders"
  on reminders for select
  using (is_business_member(business_id));

create policy "members can insert reminders"
  on reminders for insert
  with check (is_business_member(business_id));

create policy "members can update reminders"
  on reminders for update
  using (is_business_member(business_id))
  with check (is_business_member(business_id));

create table reminder_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  provider text not null check (provider in ('whatsapp_cloud_api', 'demo')),
  provider_message_id text unique,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_detail text,
  idempotency_key text unique not null,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminder_delivery_attempts_reminder_idx on reminder_delivery_attempts(reminder_id);

alter table reminder_delivery_attempts enable row level security;

create policy "members can read delivery attempts"
  on reminder_delivery_attempts for select
  using (
    exists (
      select 1 from reminders r
      where r.id = reminder_delivery_attempts.reminder_id
        and is_business_member(r.business_id)
    )
  );

-- No client insert/update policy: delivery attempts are written exclusively
-- by trusted server code (the send route handler and the webhook handler),
-- using the service-role key, which bypasses RLS by design. This is the one
-- place service-role access is expected — see lib/supabase/admin.ts.

-- ---------------------------------------------------------------------------
-- Webhook de-duplication (generic — used by the WhatsApp webhook handler)
-- ---------------------------------------------------------------------------

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

-- Service-role only; webhook callers have no Supabase auth session at all.
alter table webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- Activity / audit log
-- ---------------------------------------------------------------------------

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_business_idx on activity_events(business_id, created_at desc);

alter table activity_events enable row level security;

create policy "members can read activity"
  on activity_events for select
  using (is_business_member(business_id));

create policy "members can log activity"
  on activity_events for insert
  with check (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at before update on businesses
  for each row execute function set_updated_at();
create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
create trigger ledger_documents_set_updated_at before update on ledger_documents
  for each row execute function set_updated_at();
create trigger transactions_set_updated_at before update on transactions
  for each row execute function set_updated_at();
create trigger reminders_set_updated_at before update on reminders
  for each row execute function set_updated_at();
create trigger reminder_delivery_attempts_set_updated_at before update on reminder_delivery_attempts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: onboarding — create a business, make the caller its owner, seed a
-- walk-in customer for untracked cash sales. Runs as the caller (security
-- invoker, the default) so RLS still applies; it only succeeds because the
-- insert policies above allow an authenticated user to create a business and
-- their own membership row.
-- ---------------------------------------------------------------------------

-- `security definer`, deliberately: creating a business and inserting the
-- first membership row is a chicken-and-egg problem under RLS (you can't
-- satisfy "is a member of this business" for a business that doesn't have
-- its membership row yet, and INSERT ... RETURNING re-checks the SELECT
-- policy). Running as the (table-owning) definer bypasses RLS for exactly
-- these three inserts; safety instead comes from this function's own logic,
-- not from RLS: it only ever creates a brand-new business and makes the
-- *caller* (auth.uid(), not a client-supplied id) its owner — it accepts no
-- business_id argument, so it cannot be used to tamper with an existing
-- business. `set search_path` pins name resolution so a malicious search_path
-- can't hijack it.
create or replace function create_business_with_owner(p_name text, p_city text default 'Bengaluru')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Business name is required';
  end if;

  insert into businesses (name, city) values (trim(p_name), coalesce(p_city, 'Bengaluru'))
    returning id into v_business_id;

  insert into business_members (business_id, user_id, role)
    values (v_business_id, v_uid, 'owner');

  insert into customers (business_id, name, shop_name, is_walk_in)
    values (v_business_id, 'Walk-in Customer', 'Counter sale', true);

  insert into activity_events (business_id, actor_user_id, event_type, description)
    values (v_business_id, v_uid, 'business_created', 'Business created.');

  return v_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: confirm_ledger_transactions — atomic, idempotent batch insert of
-- reviewed ledger rows. `p_rows` is a JSON array of objects:
--   { customer_id, type, amount_paise, description, occurred_on, due_date,
--     reference_number, payment_method, idempotency_key }
-- Rows whose idempotency_key already exists are silently skipped (ON
-- CONFLICT DO NOTHING) rather than erroring, so a retried "Confirm & Save"
-- is always safe.
-- ---------------------------------------------------------------------------

create or replace function confirm_ledger_transactions(
  p_business_id uuid,
  p_ledger_document_id uuid,
  p_rows jsonb
)
returns table (id uuid, inserted boolean)
language plpgsql
-- `security definer`: the `transactions` table deliberately has NO insert
-- policy for `authenticated` (see comment above that table) — every write
-- must pass through this function's own validation (business membership,
-- customer ownership) rather than a client being able to insert a row
-- directly. Bypassing RLS here is safe only because of that validation.
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_customer_id uuid;
  v_id uuid;
  v_existing_id uuid;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not authorized for this business';
  end if;

  if p_ledger_document_id is not null then
    if not exists (
      select 1 from ledger_documents
      where id = p_ledger_document_id and business_id = p_business_id
    ) then
      raise exception 'Ledger document does not belong to this business';
    end if;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_customer_id := (v_row->>'customer_id')::uuid;

    if not exists (
      select 1 from customers c where c.id = v_customer_id and c.business_id = p_business_id
    ) then
      raise exception 'Customer % does not belong to business %', v_customer_id, p_business_id;
    end if;

    insert into transactions (
      business_id, customer_id, ledger_document_id, type, amount_paise,
      description, occurred_on, due_date, reference_number, payment_method,
      idempotency_key, created_by
    ) values (
      p_business_id,
      v_customer_id,
      p_ledger_document_id,
      v_row->>'type',
      (v_row->>'amount_paise')::bigint,
      coalesce(v_row->>'description', ''),
      (v_row->>'occurred_on')::date,
      nullif(v_row->>'due_date', '')::date,
      nullif(v_row->>'reference_number', ''),
      nullif(v_row->>'payment_method', ''),
      v_row->>'idempotency_key',
      auth.uid()
    )
    on conflict (idempotency_key) do nothing
    returning transactions.id into v_id;

    if v_id is not null then
      id := v_id;
      inserted := true;
      return next;
    else
      select transactions.id into v_existing_id
        from transactions where idempotency_key = v_row->>'idempotency_key';
      id := v_existing_id;
      inserted := false;
      return next;
    end if;
  end loop;

  if p_ledger_document_id is not null then
    update ledger_documents set status = 'confirmed' where id = p_ledger_document_id;
  end if;

  insert into activity_events (business_id, actor_user_id, event_type, description, metadata)
    values (
      p_business_id, auth.uid(), 'ledger_confirmed',
      format('%s transaction row(s) confirmed from an uploaded ledger.', jsonb_array_length(p_rows)),
      jsonb_build_object('ledger_document_id', p_ledger_document_id)
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: record_payment — idempotent single payment insert with activity log.
-- ---------------------------------------------------------------------------

create or replace function record_payment(
  p_business_id uuid,
  p_customer_id uuid,
  p_amount_paise bigint,
  p_occurred_on date,
  p_payment_method text,
  p_reference_number text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Not authorized for this business';
  end if;

  if not exists (select 1 from customers where id = p_customer_id and business_id = p_business_id) then
    raise exception 'Customer does not belong to this business';
  end if;

  if p_amount_paise <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  insert into transactions (
    business_id, customer_id, type, amount_paise, description,
    occurred_on, payment_method, reference_number, idempotency_key, created_by
  ) values (
    p_business_id, p_customer_id, 'payment_received', p_amount_paise,
    'Payment recorded', p_occurred_on, p_payment_method, p_reference_number,
    p_idempotency_key, auth.uid()
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    insert into activity_events (business_id, actor_user_id, event_type, description, metadata)
      values (
        p_business_id, auth.uid(), 'payment_recorded',
        format('Payment of %s paise recorded.', p_amount_paise),
        jsonb_build_object('customer_id', p_customer_id, 'transaction_id', v_id)
      );
  else
    select id into v_id from transactions where idempotency_key = p_idempotency_key;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: void_transaction — traceable correction. Never deletes the row.
-- ---------------------------------------------------------------------------

create or replace function void_transaction(p_transaction_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id from transactions where id = p_transaction_id;

  if v_business_id is null then
    raise exception 'Transaction not found';
  end if;

  if not is_business_member(v_business_id) then
    raise exception 'Not authorized for this business';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A void reason is required';
  end if;

  update transactions
    set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
    where id = p_transaction_id and voided_at is null;

  if not found then
    raise exception 'Transaction already voided or not found';
  end if;

  insert into activity_events (business_id, actor_user_id, event_type, description, metadata)
    values (
      v_business_id, auth.uid(), 'transaction_voided',
      format('Transaction voided: %s', trim(p_reason)),
      jsonb_build_object('transaction_id', p_transaction_id)
    );
end;
$$;
