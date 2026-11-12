-- Payment proof uploads (screenshot / PDF). No online checkout — evidence only.

alter table public.payments
  add column if not exists proof_path text,
  add column if not exists proof_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_proofs_read on storage.objects;
create policy payment_proofs_read
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    public.current_profile_role() in ('admin', 'facility', 'committee')
    or public.is_platform_admin()
    or split_part(name, '/', 1) = (
      select flat_id::text from public.profiles where user_id = auth.uid() and flat_id is not null
    )
  )
);

drop policy if exists payment_proofs_insert on storage.objects;
create policy payment_proofs_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (
    public.current_profile_role() in ('admin')
    or public.is_platform_admin()
    or split_part(name, '/', 1) = (
      select flat_id::text from public.profiles where user_id = auth.uid() and flat_id is not null
    )
  )
);

-- Refresh list_my_dues to include proof fields
create or replace function public.list_my_dues()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_flat bigint;
  rows jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('billing', 'view');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  if my_flat is null then
    return jsonb_build_object('flat', null, 'invoices', '[]'::jsonb, 'payments', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'period', i.period,
    'title', i.title,
    'status', i.status,
    'amountPaise', i.amount_paise,
    'balancePaise', i.balance_paise,
    'dueOn', i.due_on,
    'home', i.flat_number
  ) order by i.created_at desc), '[]'::jsonb)
  into rows
  from public.invoices i
  where i.flat_id = my_flat and i.status <> 'cancelled';
  return jsonb_build_object(
    'flat', (select flat_number from public.flats where id = my_flat),
    'invoices', rows,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amountPaise', p.amount_paise,
        'method', p.method,
        'reference', p.reference,
        'status', p.status,
        'at', p.created_at,
        'invoiceId', p.invoice_id,
        'proofPath', p.proof_path,
        'proofUrl', p.proof_url
      ) order by p.created_at desc)
      from public.payments p where p.flat_id = my_flat
    ), '[]'::jsonb)
  );
end;
$$;

-- Drop older overload so PostgREST sees a single signature.
drop function if exists public.record_invoice_payment(bigint, integer, text, text);

-- Admin record with optional proof path/url
create or replace function public.record_invoice_payment(
  invoice_id bigint,
  amount_paise integer,
  method text default 'offline',
  reference text default null,
  proof_path text default null,
  proof_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices%rowtype;
  pay_method text := lower(trim(coalesce(method, 'offline')));
  paid int;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.current_profile_role() not in ('admin') and not public.is_platform_admin() then
    raise exception 'Only society admin can record payments.';
  end if;
  if amount_paise is null or amount_paise <= 0 then raise exception 'Enter an amount.'; end if;
  if pay_method not in ('offline', 'upi', 'card', 'netbanking', 'razorpay') then
    pay_method := 'offline';
  end if;
  select * into inv from public.invoices where id = record_invoice_payment.invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status in ('cancelled', 'paid') then raise exception 'That invoice is closed.'; end if;

  insert into public.payments (
    flat_id, invoice_id, amount_paise, method, reference, status, recorded_by, proof_path, proof_url
  )
  values (
    inv.flat_id, inv.id, amount_paise, pay_method, nullif(trim(reference), ''), 'recorded', auth.uid(),
    nullif(trim(proof_path), ''), nullif(trim(proof_url), '')
  );

  paid := greatest(inv.balance_paise - amount_paise, 0);
  update public.invoices
  set balance_paise = paid,
      status = case when paid = 0 then 'paid' when paid < inv.amount_paise then 'partial' else status end
  where id = inv.id;

  return jsonb_build_object('ok', true, 'balancePaise', paid);
end;
$$;

revoke all on function public.record_invoice_payment(bigint, integer, text, text, text, text) from public, anon;
grant execute on function public.record_invoice_payment(bigint, integer, text, text, text, text) to authenticated;

-- Resident submits proof (pending until office confirms — does not change balance)
create or replace function public.submit_my_payment_proof(
  invoice_id bigint,
  amount_paise integer,
  proof_path text,
  method text default 'upi',
  reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  inv public.invoices%rowtype;
  pay_method text := lower(trim(coalesce(method, 'upi')));
  new_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('billing', 'view');
  select * into me from public.profiles where user_id = auth.uid();
  if me.flat_id is null or me.role = 'visitor' then
    raise exception 'Link a home first.';
  end if;
  if amount_paise is null or amount_paise <= 0 then raise exception 'Enter an amount.'; end if;
  if length(trim(coalesce(proof_path, ''))) < 3 then
    raise exception 'Attach a screenshot or PDF proof.';
  end if;
  if pay_method not in ('offline', 'upi') then pay_method := 'upi'; end if;

  select * into inv from public.invoices where id = submit_my_payment_proof.invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.flat_id <> me.flat_id then raise exception 'That invoice is not for your home.'; end if;
  if inv.status in ('cancelled', 'paid') then raise exception 'That invoice is closed.'; end if;
  if amount_paise > inv.balance_paise then raise exception 'Amount is more than the balance.'; end if;

  insert into public.payments (
    flat_id, invoice_id, amount_paise, method, reference, status, recorded_by, proof_path
  )
  values (
    inv.flat_id, inv.id, amount_paise, pay_method, nullif(trim(reference), ''), 'pending', auth.uid(),
    trim(proof_path)
  )
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id, 'status', 'pending');
end;
$$;

revoke all on function public.submit_my_payment_proof(bigint, integer, text, text, text) from public, anon;
grant execute on function public.submit_my_payment_proof(bigint, integer, text, text, text) to authenticated;

create or replace function public.confirm_pending_payment(payment_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  inv public.invoices%rowtype;
  paid int;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.current_profile_role() not in ('admin') and not public.is_platform_admin() then
    raise exception 'Only society admin can confirm payment proof.';
  end if;
  select * into pay from public.payments where id = confirm_pending_payment.payment_id for update;
  if not found then raise exception 'Payment not found.'; end if;
  if pay.status <> 'pending' then raise exception 'That entry is not waiting for confirmation.'; end if;
  if pay.invoice_id is null then raise exception 'Missing invoice.'; end if;

  select * into inv from public.invoices where id = pay.invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status = 'cancelled' then raise exception 'That invoice is cancelled.'; end if;

  update public.payments
  set status = 'recorded', recorded_by = auth.uid()
  where id = pay.id;

  paid := greatest(inv.balance_paise - pay.amount_paise, 0);
  update public.invoices
  set balance_paise = paid,
      status = case when paid = 0 then 'paid' when paid < inv.amount_paise then 'partial' else status end
  where id = inv.id;

  return jsonb_build_object('ok', true, 'balancePaise', paid);
end;
$$;

revoke all on function public.confirm_pending_payment(bigint) from public, anon;
grant execute on function public.confirm_pending_payment(bigint) to authenticated;

create or replace function public.reject_pending_payment(payment_id bigint, reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.current_profile_role() not in ('admin') and not public.is_platform_admin() then
    raise exception 'Only society admin can reject payment proof.';
  end if;
  select * into pay from public.payments where id = reject_pending_payment.payment_id for update;
  if not found then raise exception 'Payment not found.'; end if;
  if pay.status <> 'pending' then raise exception 'That entry is not waiting for confirmation.'; end if;

  update public.payments
  set status = 'failed',
      reference = case
        when nullif(trim(reason), '') is null then coalesce(reference, 'Proof rejected')
        else trim(reason)
      end
  where id = pay.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reject_pending_payment(bigint, text) from public, anon;
grant execute on function public.reject_pending_payment(bigint, text) to authenticated;
