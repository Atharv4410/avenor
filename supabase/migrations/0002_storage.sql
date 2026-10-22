-- Private storage bucket for uploaded ledger photos / receipts.
-- Objects are stored under `<business_id>/<ledger_document_id>.<ext>` so the
-- RLS policy below can authorize access purely from the path, without a
-- separate lookup table.

insert into storage.buckets (id, name, public)
values ('ledger-documents', 'ledger-documents', false)
on conflict (id) do nothing;

create policy "members can read their business's ledger documents"
  on storage.objects for select
  using (
    bucket_id = 'ledger-documents'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "members can upload ledger documents for their business"
  on storage.objects for insert
  with check (
    bucket_id = 'ledger-documents'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );
