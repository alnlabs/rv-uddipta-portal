-- Owner self-registration, admin approval, and login status lookup.

create or replace function public.protect_flat_identity()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;

  new.id := old.id;
  if old.user_id is not null then
    new.user_id := old.user_id;
  end if;
  new.flat_number := old.flat_number;
  new.floor := old.floor;
  new.unit := old.unit;
  new.type := old.type;
  new.phone := old.phone;
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.registration_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  phone text not null,
  owner_name text not null,
  flat_number text not null,
  floor integer not null,
  unit integer not null,
  type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);

create unique index if not exists registration_open_phone_idx
  on public.registration_requests (phone)
  where status in ('pending', 'approved');

create unique index if not exists registration_open_flat_idx
  on public.registration_requests (flat_number)
  where status in ('pending', 'approved');

create index if not exists registration_status_idx
  on public.registration_requests (status, created_at desc);

create or replace function public.lookup_login_status(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  f public.flats%rowtype;
  req public.registration_requests%rowtype;
begin
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    raise exception 'Enter a valid 10-digit phone number';
  end if;

  select * into f from public.flats where phone = normalized;
  if found then
    return jsonb_build_object(
      'status', 'ready',
      'ok', true,
      'message', 'Enter your password to continue.',
      'phoneMasked', case
        when length(f.phone) < 4 then '****'
        else substr(f.phone, 1, 2) || '******' || right(f.phone, 2)
      end,
      'flatNumber', f.flat_number,
      'ownerName', f.owner_name
    );
  end if;

  select * into req
  from public.registration_requests
  where phone = normalized
  order by created_at desc
  limit 1;

  if found and req.status = 'pending' then
    return jsonb_build_object(
      'status', 'pending',
      'ok', false,
      'message', 'Your registration is waiting for admin approval.',
      'flatNumber', req.flat_number,
      'ownerName', req.owner_name
    );
  end if;

  if found and req.status = 'rejected' then
    return jsonb_build_object(
      'status', 'rejected',
      'ok', false,
      'message', 'Your registration was not approved. You can apply again.',
      'flatNumber', req.flat_number
    );
  end if;

  return jsonb_build_object(
    'status', 'unknown',
    'ok', false,
    'message', 'No owner found for this phone. Register to request access.'
  );
end;
$$;

alter table public.registration_requests enable row level security;

drop policy if exists owners_read_own_registration on public.registration_requests;
create policy owners_read_own_registration
on public.registration_requests
for select
to authenticated
using (auth.uid() = user_id);

revoke all on public.registration_requests from public, anon, authenticated;
grant select on public.registration_requests to authenticated;

revoke all on function public.lookup_login_status(text) from public;
grant execute on function public.lookup_login_status(text) to anon, authenticated;
