-- Initial schema: flats board, masked public view, phone login RPC, RLS.

create table if not exists public.flats (
  id bigint generated always as identity primary key,
  user_id uuid unique references auth.users (id) on delete set null,
  flat_number text not null unique,
  floor integer not null,
  unit integer not null,
  type text not null,
  owner_name text not null,
  phone text not null unique,
  registration text not null default 'pending'
    check (registration in ('pending', 'completed')),
  interior text not null default 'not_started'
    check (interior in ('not_started', 'in_progress', 'completed')),
  ceremony text not null default 'pending'
    check (ceremony in ('pending', 'completed')),
  moving text not null default 'pending'
    check (moving in ('pending', 'moved_in')),
  updated_at timestamptz not null default now(),
  constraint owner_name_len check (char_length(trim(owner_name)) >= 2)
);

create index if not exists flats_floor_unit_idx on public.flats (floor, unit);

create or replace function public.protect_flat_identity()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists protect_flat_identity on public.flats;
create trigger protect_flat_identity
before update on public.flats
for each row
execute procedure public.protect_flat_identity();

-- Public board: masked phones only. security_invoker is off so anon cannot
-- read public.flats directly and still see this view.
create or replace view public.flats_public
with (security_invoker = false) as
select
  id,
  flat_number,
  floor,
  unit,
  type,
  owner_name,
  case
    when phone is null or length(phone) < 4 then '****'
    else substr(phone, 1, 2) || '******' || right(phone, 2)
  end as phone_masked,
  registration,
  interior,
  ceremony,
  moving,
  updated_at
from public.flats;

create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  if raw is null then
    return null;
  end if;

  digits := regexp_replace(raw, '\D', '', 'g');

  if length(digits) = 12 and left(digits, 2) = '91' then
    digits := substr(digits, 3);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    digits := substr(digits, 2);
  end if;

  if digits ~ '^\d{10}$' then
    return digits;
  end if;

  return null;
end;
$$;

create or replace function public.request_owner_login(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  f public.flats%rowtype;
begin
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    raise exception 'Enter a valid 10-digit phone number';
  end if;

  select * into f from public.flats where phone = normalized;
  if not found then
    raise exception 'No owner found for this phone. Use a seeded owners-list number.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'OTP sent (demo). Use 1234 to continue.',
    'phoneMasked', case
      when length(f.phone) < 4 then '****'
      else substr(f.phone, 1, 2) || '******' || right(f.phone, 2)
    end,
    'flatNumber', f.flat_number,
    'ownerName', f.owner_name
  );
end;
$$;

alter table public.flats enable row level security;

drop policy if exists owners_select_own_flat on public.flats;
create policy owners_select_own_flat
on public.flats
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists owners_update_own_flat on public.flats;
create policy owners_update_own_flat
on public.flats
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke all on public.flats from public, anon, authenticated;
grant select, update on public.flats to authenticated;

revoke all on public.flats_public from public, anon, authenticated;
grant select on public.flats_public to anon, authenticated;

revoke all on function public.normalize_phone(text) from public, anon, authenticated;
revoke all on function public.request_owner_login(text) from public;
grant execute on function public.request_owner_login(text) to anon, authenticated;
