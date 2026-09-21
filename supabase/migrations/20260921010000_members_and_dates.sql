-- Milestone dates on flats + household members owners can manage.

alter table public.flats
  add column if not exists registration_date date,
  add column if not exists interior_date date,
  add column if not exists ceremony_date date,
  add column if not exists moving_date date;

drop view if exists public.flats_public;
create or replace view public.flats_public
with (security_invoker = true) as
select
  id,
  flat_number,
  wing,
  floor,
  unit,
  type,
  facing,
  area_sqft,
  owner_name,
  case
    when phone is null or length(phone) < 4 then '****'
    else substr(phone, 1, 2) || '******' || right(phone, 2)
  end as phone_masked,
  registration,
  interior,
  ceremony,
  moving,
  registration_date,
  interior_date,
  ceremony_date,
  moving_date,
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;

create table if not exists public.flat_members (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  name text not null,
  relation text not null default 'other'
    check (relation in ('spouse', 'child', 'parent', 'sibling', 'other')),
  phone text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flat_members_name_len check (char_length(trim(name)) >= 2)
);

create index if not exists flat_members_flat_id_idx
  on public.flat_members (flat_id);

create or replace function public.touch_flat_member_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists flat_members_touch_updated_at on public.flat_members;
create trigger flat_members_touch_updated_at
before update on public.flat_members
for each row
execute function public.touch_flat_member_updated_at();

alter table public.flat_members enable row level security;

drop policy if exists approved_owners_read_members on public.flat_members;
create policy approved_owners_read_members
on public.flat_members
for select
to authenticated
using (public.is_approved_owner());

drop policy if exists owners_insert_own_members on public.flat_members;
create policy owners_insert_own_members
on public.flat_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.flats
    where flats.id = flat_members.flat_id
      and flats.user_id = auth.uid()
  )
);

drop policy if exists owners_update_own_members on public.flat_members;
create policy owners_update_own_members
on public.flat_members
for update
to authenticated
using (
  exists (
    select 1 from public.flats
    where flats.id = flat_members.flat_id
      and flats.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.flats
    where flats.id = flat_members.flat_id
      and flats.user_id = auth.uid()
  )
);

drop policy if exists owners_delete_own_members on public.flat_members;
create policy owners_delete_own_members
on public.flat_members
for delete
to authenticated
using (
  exists (
    select 1 from public.flats
    where flats.id = flat_members.flat_id
      and flats.user_id = auth.uid()
  )
);

revoke all on public.flat_members from public, anon;
grant select, insert, update, delete on public.flat_members to authenticated;
