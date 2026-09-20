-- Brochure inventory: wing, facing, saleable area, and vacant flats.

alter table public.flats
  add column if not exists wing text,
  add column if not exists facing text,
  add column if not exists area_sqft integer;

alter table public.flats
  alter column owner_name drop not null,
  alter column phone drop not null;

alter table public.flats drop constraint if exists owner_name_len;
alter table public.flats
  add constraint owner_name_len
  check (owner_name is null or char_length(trim(owner_name)) >= 2);

alter table public.flats drop constraint if exists flats_wing_check;
alter table public.flats
  add constraint flats_wing_check
  check (wing is null or wing in ('A', 'B'));

alter table public.flats drop constraint if exists flats_facing_check;
alter table public.flats
  add constraint flats_facing_check
  check (facing is null or facing in ('E', 'W'));

create index if not exists flats_wing_floor_unit_idx
  on public.flats (wing, floor, unit);

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
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;
