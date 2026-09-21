-- Profile photos for owners and household members.

alter table public.flats
  add column if not exists owner_photo_url text;

alter table public.flat_members
  add column if not exists photo_url text;

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

-- Storage bucket for profile photos (public read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_flat_id_from_path(object_name text)
returns bigint
language sql
immutable
as $$
  select nullif(substring(object_name from '^flat-([0-9]+)'), '')::bigint;
$$;

create or replace function public.can_manage_flat_photos(flat_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() in ('admin', 'co_owner')
    or exists (
      select 1
      from public.flats
      where flats.id = flat_id
        and flats.user_id = auth.uid()
    );
$$;

drop policy if exists profile_photos_public_read on storage.objects;
create policy profile_photos_public_read
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

drop policy if exists profile_photos_owner_insert on storage.objects;
create policy profile_photos_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and public.can_manage_flat_photos(public.storage_flat_id_from_path(name))
);

drop policy if exists profile_photos_owner_update on storage.objects;
create policy profile_photos_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.can_manage_flat_photos(public.storage_flat_id_from_path(name))
)
with check (
  bucket_id = 'profile-photos'
  and public.can_manage_flat_photos(public.storage_flat_id_from_path(name))
);

drop policy if exists profile_photos_owner_delete on storage.objects;
create policy profile_photos_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.can_manage_flat_photos(public.storage_flat_id_from_path(name))
);
