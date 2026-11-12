-- Community business pack: billing, NOCs, workforce passes, parking bays,
-- building ops, assets/AMC, circulars, security blacklist + material exit.

-- Feature switches -----------------------------------------------------------
insert into public.community_features (key, label, feature_group, summary, enabled)
values
  ('billing', 'Dues and billing', 'Services', 'Society dues, invoices, and receipts.', true),
  ('workforce', 'Helpers and vendors', 'Visitors', 'Domestic help, vendors, and cab passes.', true),
  ('ops', 'Building ops', 'Building', 'Outages, tankers, and building status logs.', true),
  ('assets', 'Assets and AMC', 'Building', 'Lifts, pumps, fire systems and contracts.', true),
  ('circulars', 'Circulars', 'Community', 'Official circulars with read acknowledgement.', true),
  ('security_ops', 'Security ops', 'Visitors', 'Blacklist, material exit, and incidents.', true)
on conflict (key) do nothing;

-- Billing --------------------------------------------------------------------
create table if not exists public.fee_heads (
  id bigint generated always as identity primary key,
  key text not null unique,
  label text not null,
  amount_paise integer not null check (amount_paise >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  flat_number text not null,
  period text not null,
  title text not null,
  status text not null default 'open'
    check (status in ('draft', 'open', 'paid', 'cancelled', 'partial')),
  amount_paise integer not null default 0 check (amount_paise >= 0),
  balance_paise integer not null default 0 check (balance_paise >= 0),
  due_on date,
  created_at timestamptz not null default now(),
  unique (flat_id, period, title)
);

create table if not exists public.invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices (id) on delete cascade,
  fee_head_id bigint references public.fee_heads (id) on delete set null,
  label text not null,
  amount_paise integer not null check (amount_paise >= 0)
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  invoice_id bigint references public.invoices (id) on delete set null,
  amount_paise integer not null check (amount_paise > 0),
  method text not null default 'offline'
    check (method in ('offline', 'upi', 'card', 'netbanking', 'razorpay')),
  reference text,
  status text not null default 'recorded'
    check (status in ('recorded', 'pending', 'failed', 'refunded')),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.fee_heads (key, label, amount_paise)
values ('maintenance', 'Maintenance', 350000)
on conflict (key) do nothing;

-- NOCs / documents -----------------------------------------------------------
create table if not exists public.document_requests (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  flat_number text not null,
  requested_by uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('move_in', 'move_out', 'sale', 'renovation', 'tenant', 'other')),
  title text not null,
  note text,
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'under_review', 'issued', 'rejected')),
  reject_reason text,
  file_path text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Workforce ------------------------------------------------------------------
create table if not exists public.workforce_people (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('domestic', 'vendor', 'cab')),
  name text not null,
  phone text,
  photo_url text,
  code text not null unique,
  blacklisted boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workforce_links (
  id bigint generated always as identity primary key,
  person_id bigint not null references public.workforce_people (id) on delete cascade,
  flat_id bigint not null references public.flats (id) on delete cascade,
  flat_number text not null,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (person_id, flat_id)
);

-- Parking bays ---------------------------------------------------------------
create table if not exists public.parking_bays (
  id bigint generated always as identity primary key,
  label text not null unique,
  kind text not null default 'resident'
    check (kind in ('resident', 'visitor')),
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text,
  sticker text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Building ops ---------------------------------------------------------------
create table if not exists public.ops_logs (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('water', 'power', 'lift', 'dg', 'tanker', 'other')),
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  title text not null,
  body text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Assets / AMC ---------------------------------------------------------------
create table if not exists public.assets (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null default 'other',
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.amc_contracts (
  id bigint generated always as identity primary key,
  asset_id bigint not null references public.assets (id) on delete cascade,
  vendor_name text not null,
  starts_on date,
  ends_on date,
  note text,
  created_at timestamptz not null default now()
);

-- Circulars ------------------------------------------------------------------
create table if not exists public.circulars (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.circular_reads (
  circular_id bigint not null references public.circulars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (circular_id, user_id)
);

-- Security ops ---------------------------------------------------------------
create table if not exists public.security_blacklist (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('person', 'vehicle', 'phone')),
  value text not null,
  reason text,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.material_exits (
  id bigint generated always as identity primary key,
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text,
  description text not null,
  carrier_name text,
  vehicle text,
  status text not null default 'open'
    check (status in ('open', 'allowed', 'stopped', 'done')),
  created_by uuid references auth.users (id) on delete set null,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.security_incidents (
  id bigint generated always as identity primary key,
  title text not null,
  body text,
  severity text not null default 'low'
    check (severity in ('low', 'medium', 'high')),
  status text not null default 'open'
    check (status in ('open', 'closed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Grants ---------------------------------------------------------------------
revoke all on public.fee_heads from public, anon;
revoke all on public.invoices from public, anon;
revoke all on public.invoice_lines from public, anon;
revoke all on public.payments from public, anon;
revoke all on public.document_requests from public, anon;
revoke all on public.workforce_people from public, anon;
revoke all on public.workforce_links from public, anon;
revoke all on public.parking_bays from public, anon;
revoke all on public.ops_logs from public, anon;
revoke all on public.assets from public, anon;
revoke all on public.amc_contracts from public, anon;
revoke all on public.circulars from public, anon;
revoke all on public.circular_reads from public, anon;
revoke all on public.security_blacklist from public, anon;
revoke all on public.material_exits from public, anon;
revoke all on public.security_incidents from public, anon;

grant select on public.fee_heads to authenticated;
grant select on public.invoices to authenticated;
grant select on public.invoice_lines to authenticated;
grant select on public.payments to authenticated;
grant select, insert, update on public.document_requests to authenticated;
grant select, insert, update on public.workforce_people to authenticated;
grant select, insert, update on public.workforce_links to authenticated;
grant select on public.parking_bays to authenticated;
grant select on public.ops_logs to authenticated;
grant select on public.assets to authenticated;
grant select on public.amc_contracts to authenticated;
grant select on public.circulars to authenticated;
grant select, insert on public.circular_reads to authenticated;
grant select on public.security_blacklist to authenticated;
grant select, insert, update on public.material_exits to authenticated;
grant select, insert, update on public.security_incidents to authenticated;

alter table public.fee_heads enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.document_requests enable row level security;
alter table public.workforce_people enable row level security;
alter table public.workforce_links enable row level security;
alter table public.parking_bays enable row level security;
alter table public.ops_logs enable row level security;
alter table public.assets enable row level security;
alter table public.amc_contracts enable row level security;
alter table public.circulars enable row level security;
alter table public.circular_reads enable row level security;
alter table public.security_blacklist enable row level security;
alter table public.material_exits enable row level security;
alter table public.security_incidents enable row level security;

drop policy if exists invoices_read_own on public.invoices;
create policy invoices_read_own on public.invoices for select to authenticated
using (
  flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'facility', 'committee')
  or public.is_platform_admin()
);

drop policy if exists invoice_lines_read on public.invoice_lines;
create policy invoice_lines_read on public.invoice_lines for select to authenticated
using (
  invoice_id in (select id from public.invoices)
);

drop policy if exists payments_read_own on public.payments;
create policy payments_read_own on public.payments for select to authenticated
using (
  flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'facility', 'committee')
  or public.is_platform_admin()
);

drop policy if exists fee_heads_read on public.fee_heads;
create policy fee_heads_read on public.fee_heads for select to authenticated using (true);

drop policy if exists document_requests_own on public.document_requests;
create policy document_requests_own on public.document_requests for all to authenticated
using (
  requested_by = auth.uid()
  or flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'facility')
  or public.is_platform_admin()
)
with check (
  requested_by = auth.uid()
  or public.current_profile_role() in ('admin', 'facility')
  or public.is_platform_admin()
);

drop policy if exists workforce_read on public.workforce_people;
create policy workforce_read on public.workforce_people for select to authenticated using (true);
drop policy if exists workforce_write on public.workforce_people;
create policy workforce_write on public.workforce_people for insert to authenticated
with check (auth.uid() is not null);
drop policy if exists workforce_update on public.workforce_people;
create policy workforce_update on public.workforce_people for update to authenticated
using (
  created_by = auth.uid()
  or public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
);

drop policy if exists workforce_links_rw on public.workforce_links;
create policy workforce_links_rw on public.workforce_links for all to authenticated
using (
  flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
)
with check (
  flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
);

drop policy if exists parking_bays_read on public.parking_bays;
create policy parking_bays_read on public.parking_bays for select to authenticated using (true);

drop policy if exists ops_logs_read on public.ops_logs;
create policy ops_logs_read on public.ops_logs for select to authenticated using (true);

drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select to authenticated using (true);
drop policy if exists amc_read on public.amc_contracts;
create policy amc_read on public.amc_contracts for select to authenticated using (true);

drop policy if exists circulars_read on public.circulars;
create policy circulars_read on public.circulars for select to authenticated using (true);
drop policy if exists circular_reads_own on public.circular_reads;
create policy circular_reads_own on public.circular_reads for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists blacklist_read on public.security_blacklist;
create policy blacklist_read on public.security_blacklist for select to authenticated
using (
  public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
);

drop policy if exists material_exits_rw on public.material_exits;
create policy material_exits_rw on public.material_exits for all to authenticated
using (
  created_by = auth.uid()
  or flat_id in (select flat_id from public.profiles where user_id = auth.uid() and flat_id is not null)
  or public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
)
with check (auth.uid() is not null);

drop policy if exists incidents_rw on public.security_incidents;
create policy incidents_rw on public.security_incidents for all to authenticated
using (
  public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
)
with check (
  public.current_profile_role() in ('admin', 'security')
  or public.is_platform_admin()
);

-- RPCs: billing --------------------------------------------------------------
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
        'invoiceId', p.invoice_id
      ) order by p.created_at desc)
      from public.payments p where p.flat_id = my_flat
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_my_dues() from public, anon;
grant execute on function public.list_my_dues() to authenticated;

create or replace function public.post_dues_run(
  period text,
  title text,
  fee_head_key text default 'maintenance',
  due_on date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  head public.fee_heads%rowtype;
  flat record;
  created int := 0;
  inv_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.current_profile_role() not in ('admin') and not public.is_platform_admin() then
    raise exception 'Only society admin can post dues.';
  end if;
  if length(trim(period)) < 4 then raise exception 'Enter a billing period.'; end if;
  select * into head from public.fee_heads where key = coalesce(nullif(trim(fee_head_key), ''), 'maintenance') and active;
  if not found then raise exception 'That fee head was not found.'; end if;

  for flat in
    select id, flat_number from public.flats where coalesce(sale_status, 'sold') = 'sold'
  loop
    insert into public.invoices (flat_id, flat_number, period, title, status, amount_paise, balance_paise, due_on)
    values (
      flat.id,
      flat.flat_number,
      trim(period),
      coalesce(nullif(trim(title), ''), head.label || ' · ' || trim(period)),
      'open',
      head.amount_paise,
      head.amount_paise,
      due_on
    )
    on conflict (flat_id, period, title) do nothing
    returning id into inv_id;
    if inv_id is not null then
      insert into public.invoice_lines (invoice_id, fee_head_id, label, amount_paise)
      values (inv_id, head.id, head.label, head.amount_paise);
      created := created + 1;
      inv_id := null;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'created', created, 'period', trim(period));
end;
$$;

revoke all on function public.post_dues_run(text, text, text, date) from public, anon;
grant execute on function public.post_dues_run(text, text, text, date) to authenticated;

create or replace function public.record_invoice_payment(
  invoice_id bigint,
  amount_paise integer,
  method text default 'offline',
  reference text default null
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

  insert into public.payments (flat_id, invoice_id, amount_paise, method, reference, status, recorded_by)
  values (inv.flat_id, inv.id, amount_paise, pay_method, nullif(trim(reference), ''), 'recorded', auth.uid());

  paid := greatest(inv.balance_paise - amount_paise, 0);
  update public.invoices
  set balance_paise = paid,
      status = case when paid = 0 then 'paid' when paid < amount_paise or paid < inv.amount_paise then 'partial' else status end
  where id = inv.id;

  return jsonb_build_object('ok', true, 'balancePaise', paid);
end;
$$;

revoke all on function public.record_invoice_payment(bigint, integer, text, text) from public, anon;
grant execute on function public.record_invoice_payment(bigint, integer, text, text) to authenticated;

-- RPCs: NOC ------------------------------------------------------------------
create or replace function public.request_my_document(
  kind text,
  title text,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  home text;
  new_id bigint;
  next_kind text := lower(trim(kind));
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('documents', 'manage');
  select * into me from public.profiles where user_id = auth.uid();
  if me.flat_id is null or me.role = 'visitor' then
    raise exception 'Link a home before requesting papers.';
  end if;
  if next_kind not in ('move_in', 'move_out', 'sale', 'renovation', 'tenant', 'other') then
    raise exception 'Choose a valid document type.';
  end if;
  if length(trim(title)) < 2 then raise exception 'Enter a title.'; end if;
  select flat_number into home from public.flats where id = me.flat_id;
  insert into public.document_requests (flat_id, flat_number, requested_by, kind, title, note, status)
  values (me.flat_id, home, auth.uid(), next_kind, trim(title), nullif(trim(note), ''), 'submitted')
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

revoke all on function public.request_my_document(text, text, text) from public, anon;
grant execute on function public.request_my_document(text, text, text) to authenticated;

create or replace function public.list_my_documents()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_flat bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('documents', 'view');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  return jsonb_build_object(
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'kind', r.kind,
        'title', r.title,
        'status', r.status,
        'note', r.note,
        'home', r.flat_number,
        'rejectReason', r.reject_reason,
        'filePath', r.file_path,
        'at', r.created_at
      ) order by r.created_at desc)
      from public.document_requests r
      where r.flat_id = my_flat or r.requested_by = auth.uid()
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_my_documents() from public, anon;
grant execute on function public.list_my_documents() to authenticated;

-- RPCs: workforce ------------------------------------------------------------
create or replace function public.add_my_workforce(
  kind text,
  name text,
  phone text default null,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  home text;
  person_id bigint;
  next_code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  next_kind text := lower(trim(kind));
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('workforce', 'manage');
  select * into me from public.profiles where user_id = auth.uid();
  if me.flat_id is null or me.role = 'visitor' then
    raise exception 'Link a home first.';
  end if;
  if next_kind not in ('domestic', 'vendor', 'cab') then
    raise exception 'Choose domestic, vendor, or cab.';
  end if;
  if length(trim(name)) < 2 then raise exception 'Enter a name.'; end if;
  select flat_number into home from public.flats where id = me.flat_id;
  next_code := 'W';
  for i in 1..7 loop
    next_code := next_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  insert into public.workforce_people (kind, name, phone, code, created_by)
  values (next_kind, trim(name), nullif(trim(phone), ''), next_code, auth.uid())
  returning id into person_id;
  insert into public.workforce_links (person_id, flat_id, flat_number, note)
  values (person_id, me.flat_id, home, nullif(trim(note), ''));
  return jsonb_build_object('ok', true, 'id', person_id, 'code', next_code);
end;
$$;

revoke all on function public.add_my_workforce(text, text, text, text) from public, anon;
grant execute on function public.add_my_workforce(text, text, text, text) to authenticated;

create or replace function public.list_my_workforce()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_flat bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('workforce', 'view');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  return jsonb_build_object(
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'kind', p.kind,
        'name', p.name,
        'phone', p.phone,
        'code', p.code,
        'blacklisted', p.blacklisted,
        'active', l.active,
        'home', l.flat_number,
        'note', l.note
      ) order by p.name)
      from public.workforce_links l
      join public.workforce_people p on p.id = l.person_id
      where l.flat_id = my_flat and l.active
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_my_workforce() from public, anon;
grant execute on function public.list_my_workforce() to authenticated;

create or replace function public.lookup_workforce_code(pass_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row record;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.current_profile_role() <> 'security' and not public.is_platform_admin() then
    raise exception 'The gate is for security.';
  end if;
  select p.*, l.flat_number, l.active as link_active
    into row
  from public.workforce_people p
  left join public.workforce_links l on l.person_id = p.id and l.active
  where upper(p.code) = upper(trim(pass_code))
  limit 1;
  if not found then raise exception 'No helper pass for that code.'; end if;
  return jsonb_build_object(
    'id', row.id,
    'name', row.name,
    'kind', row.kind,
    'phone', row.phone,
    'code', row.code,
    'home', row.flat_number,
    'blacklisted', row.blacklisted,
    'active', coalesce(row.link_active, false),
    'allowed', (not row.blacklisted) and coalesce(row.link_active, false)
  );
end;
$$;

revoke all on function public.lookup_workforce_code(text) from public, anon;
grant execute on function public.lookup_workforce_code(text) to authenticated;

-- RPCs: ops / circulars / parking list --------------------------------------
create or replace function public.list_building_ops()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  return jsonb_build_object(
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'kind', o.kind, 'status', o.status, 'title', o.title, 'body', o.body, 'at', o.created_at
      ) order by o.created_at desc)
      from public.ops_logs o where o.status = 'open'
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'kind', o.kind, 'status', o.status, 'title', o.title, 'body', o.body, 'at', o.created_at
      ) order by o.created_at desc)
      from public.ops_logs o
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_building_ops() from public, anon;
grant execute on function public.list_building_ops() to authenticated;

create or replace function public.list_my_circulars()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('circulars', 'view');
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'body', c.body,
        'at', c.created_at,
        'read', exists (
          select 1 from public.circular_reads r
          where r.circular_id = c.id and r.user_id = auth.uid()
        )
      ) order by c.created_at desc)
      from public.circulars c
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_my_circulars() from public, anon;
grant execute on function public.list_my_circulars() to authenticated;

create or replace function public.ack_my_circular(circular_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.phone_require('circulars', 'view');
  insert into public.circular_reads (circular_id, user_id)
  values (ack_my_circular.circular_id, auth.uid())
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.ack_my_circular(bigint) from public, anon;
grant execute on function public.ack_my_circular(bigint) to authenticated;
