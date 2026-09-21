-- Owner contact email, shown in community owner details.

alter table public.flats
  add column if not exists email text;

update public.flats f
set email = u.email
from auth.users u
where f.user_id = u.id
  and u.email is not null
  and (f.email is null or btrim(f.email) = '');

update public.flats f
set email = r.email
from public.registration_requests r
where r.flat_number = f.flat_number
  and r.status = 'approved'
  and r.email is not null
  and btrim(r.email) <> ''
  and (f.email is null or btrim(f.email) = '');

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
  new.email := old.email;
  new.updated_at := now();
  return new;
end;
$$;

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
  owner_photo_url,
  email,
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
