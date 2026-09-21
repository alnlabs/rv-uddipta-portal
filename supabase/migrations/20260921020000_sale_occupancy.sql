-- Sale status, occupancy (owner stay vs rented), and community-safe tenant fields.

alter table public.flats
  add column if not exists sale_status text not null default 'unsold',
  add column if not exists occupancy text,
  add column if not exists tenant_name text,
  add column if not exists tenant_phone text;

alter table public.flats drop constraint if exists flats_sale_status_check;
alter table public.flats
  add constraint flats_sale_status_check
  check (sale_status in ('unsold', 'sold'));

alter table public.flats drop constraint if exists flats_occupancy_check;
alter table public.flats
  add constraint flats_occupancy_check
  check (occupancy is null or occupancy in ('owner_stay', 'rented'));

alter table public.flats drop constraint if exists flats_tenant_name_len;
alter table public.flats
  add constraint flats_tenant_name_len
  check (tenant_name is null or char_length(trim(tenant_name)) >= 2);

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
        or (occupancy = 'rented' and tenant_name is not null)
      )
    )
  );

-- Existing named owners are treated as sold / owner-occupied.
update public.flats
set
  sale_status = 'sold',
  occupancy = 'owner_stay',
  tenant_name = null,
  tenant_phone = null
where owner_name is not null
  and trim(owner_name) <> '';

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
  interior_date,
  ceremony_date,
  moving_date,
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;
