-- Interior start date + renters history with dates.

alter table public.flats
  add column if not exists interior_start_date date;

-- Rented no longer requires tenant_* on flats (renters table is source of truth).
alter table public.flats drop constraint if exists flats_sale_occupancy_consistency;
alter table public.flats
  add constraint flats_sale_occupancy_consistency
  check (
    (
      sale_status = 'unsold'
      and occupancy is null
      and tenant_name is null
      and tenant_phone is null
    )
    or (
      sale_status = 'sold'
      and occupancy in ('owner_stay', 'rented')
      and (
        (occupancy = 'owner_stay' and tenant_name is null and tenant_phone is null)
        or occupancy = 'rented'
      )
    )
  );

create table if not exists public.flat_renters (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  name text not null,
  phone text,
  start_date date,
  end_date date,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flat_renters_name_len check (char_length(trim(name)) >= 2),
  constraint flat_renters_dates_ok check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create index if not exists flat_renters_flat_id_idx on public.flat_renters (flat_id);

create or replace function public.touch_flat_renter_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists flat_renters_touch_updated_at on public.flat_renters;
create trigger flat_renters_touch_updated_at
before update on public.flat_renters
for each row
execute function public.touch_flat_renter_updated_at();

alter table public.flat_renters enable row level security;

drop policy if exists community_read_renters on public.flat_renters;
create policy community_read_renters
on public.flat_renters
for select
to authenticated
using (public.can_read_community());

drop policy if exists owners_insert_own_renters on public.flat_renters;
create policy owners_insert_own_renters
on public.flat_renters
for insert
to authenticated
with check (
  exists (
    select 1 from public.flats
    where flats.id = flat_renters.flat_id
      and flats.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'co_owner')
);

drop policy if exists owners_update_own_renters on public.flat_renters;
create policy owners_update_own_renters
on public.flat_renters
for update
to authenticated
using (
  exists (
    select 1 from public.flats
    where flats.id = flat_renters.flat_id
      and flats.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'co_owner')
)
with check (
  exists (
    select 1 from public.flats
    where flats.id = flat_renters.flat_id
      and flats.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'co_owner')
);

drop policy if exists owners_delete_own_renters on public.flat_renters;
create policy owners_delete_own_renters
on public.flat_renters
for delete
to authenticated
using (
  exists (
    select 1 from public.flats
    where flats.id = flat_renters.flat_id
      and flats.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'co_owner')
);

revoke all on public.flat_renters from public, anon;
grant select, insert, update, delete on public.flat_renters to authenticated;

-- Seed renters from existing single tenant fields.
insert into public.flat_renters (flat_id, name, phone, start_date, sort_order)
select
  f.id,
  trim(f.tenant_name),
  f.tenant_phone,
  coalesce(f.moving_date, f.updated_at::date),
  0
from public.flats f
where f.occupancy = 'rented'
  and f.tenant_name is not null
  and char_length(trim(f.tenant_name)) >= 2
  and not exists (
    select 1 from public.flat_renters r where r.flat_id = f.id
  );

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
  sale_status,
  occupancy,
  open_for_rent,
  open_for_resale,
  owner_name,
  case
    when phone is null or length(phone) < 4 then '****'
    else substr(phone, 1, 2) || '******' || right(phone, 2)
  end as phone_masked,
  tenant_name,
  case
    when tenant_phone is null or length(tenant_phone) < 4 then null
    else substr(tenant_phone, 1, 2) || '******' || right(tenant_phone, 2)
  end as tenant_phone_masked,
  registration,
  interior,
  ceremony,
  moving,
  registration_date,
  interior_start_date,
  interior_date,
  ceremony_date,
  moving_date,
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;
