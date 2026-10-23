-- Re-deploys confirm_ledger_transactions with the ambiguous-column fix that
-- was already present in 0001_init.sql's *file* but, it turns out, was never
-- actually re-applied to this project's live database after it was found —
-- so production was still running the original broken version, which fails
-- every ledger upload confirm with:
--   { code: '42702', message: 'column reference "id" is ambiguous' }
-- The function's own `returns table (id uuid, inserted boolean)` output
-- parameter named `id` collides with `customers.id` inside the
-- unqualified `where id = v_customer_id` exists-check. Qualifying it as
-- `c.id` (and `c.business_id`) on an aliased `customers c` resolves it.
--
-- This is a pure `create or replace function` — no table, data, or RLS
-- change — safe to run any number of times.

create or replace function confirm_ledger_transactions(
  p_business_id uuid,
  p_ledger_document_id uuid,
  p_rows jsonb
)
returns table (id uuid, inserted boolean)
language plpgsql
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
