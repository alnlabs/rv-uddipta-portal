-- Profiles/roles, listing flags, project_info, activity feed, notifications.

-- Listing intent on sold flats
alter table public.flats
  add column if not exists open_for_rent boolean not null default false,
  add column if not exists open_for_resale boolean not null default false;

alter table public.flats drop constraint if exists flats_listing_sold_only;
alter table public.flats
  add constraint flats_listing_sold_only
  check (
    (sale_status = 'sold')
    or (open_for_rent = false and open_for_resale = false)
  );

-- Profiles / roles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'visitor'
    check (role in ('admin', 'builder', 'owner', 'co_owner', 'visitor', 'tenant')),
  flat_id bigint references public.flats (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_flat_role_check check (
    (role in ('admin', 'builder', 'visitor') and flat_id is null)
    or (role in ('owner', 'co_owner', 'tenant') and flat_id is not null)
    or (role in ('admin', 'builder') and flat_id is not null)
  )
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_flat_id_idx on public.profiles (flat_id);

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_profile_updated_at();

-- Project / builder info (single row)
create table if not exists public.project_info (
  id int primary key default 1 check (id = 1),
  name text not null,
  developer text not null,
  tagline text,
  location text,
  address text,
  acres numeric,
  units integer,
  floors integer,
  rera text,
  igbc text,
  clubhouse_sqft integer,
  greenery_facing_percent integer,
  nearby jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.project_info (
  id, name, developer, tagline, location, address, acres, units, floors,
  rera, igbc, clubhouse_sqft, greenery_facing_percent, nearby, amenities
) values (
  1,
  'RV Uddiipta',
  'RV Nirmaan Private Limited',
  'Premium 2 & 3 BHK high-rise residences',
  'Karmanghat, Hyderabad',
  'Sy. No. 66, ZP Road, adjacent to Bhupeshgupta Nagar, Karmanghat',
  2.2,
  238,
  10,
  'P02400004125',
  'IGBCGH220103',
  16000,
  65,
  '[{"label":"LB Nagar Circle","distance":"3.6 km"},{"label":"Dilsukhnagar","distance":"8.2 km"},{"label":"Rajiv Gandhi International Airport","distance":"21 km"}]'::jsonb,
  '["16,000 sft clubhouse","Gymnasium","Multipurpose hall","Guest rooms","Walking & jogging track","Cricket pitch","Basketball practice","Children''s play area","Meditation zone","24/7 security","Video door phone","EV charging","Solar fencing","STP treated water"]'::jsonb
)
on conflict (id) do nothing;

-- Activity feed
create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  flat_id bigint references public.flats (id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'community'
    check (visibility in ('public', 'community')),
  created_at timestamptz not null default now()
);

create index if not exists activity_events_created_idx
  on public.activity_events (created_at desc);
create index if not exists activity_events_visibility_idx
  on public.activity_events (visibility, created_at desc);

-- Notifications
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id bigint references public.activity_events (id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- Access helpers
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.can_read_community()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_approved_owner()
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'builder', 'owner', 'co_owner', 'tenant')
    );
$$;

create or replace function public.can_read_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Any signed-in user with a profile (incl. visitor) or approved owner.
  select auth.uid() is not null and (
    public.is_approved_owner()
    or exists (select 1 from public.profiles p where p.user_id = auth.uid())
  );
$$;

revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.can_read_community() from public, anon;
revoke all on function public.can_read_board() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.can_read_community() to authenticated;
grant execute on function public.can_read_board() to authenticated;

-- Widen flats select: approved owners OR community roles OR visitors (brochure via view)
drop policy if exists approved_owners_read_board on public.flats;
create policy signed_in_read_flats
on public.flats
for select
to authenticated
using (public.can_read_board());

drop policy if exists approved_owners_read_members on public.flat_members;
create policy community_read_members
on public.flat_members
for select
to authenticated
using (public.can_read_community());

-- Recreate flats_public with listing flags
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
  interior_date,
  ceremony_date,
  moving_date,
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;

-- Brochure view: no owner PII (visitors use this via app strip; also grant select)
drop view if exists public.flats_brochure;
create or replace view public.flats_brochure
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
  open_for_rent,
  open_for_resale
from public.flats;

grant select on public.flats_brochure to authenticated;

-- RLS profiles
alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
on public.profiles for select to authenticated
using (
  user_id = auth.uid()
  or public.can_read_community()
  or public.current_profile_role() = 'admin'
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- project_info readable by signed-in; writable via service role / admin actions
alter table public.project_info enable row level security;

drop policy if exists project_info_read on public.project_info;
create policy project_info_read
on public.project_info for select to authenticated
using (true);

-- activity / notifications RLS
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;

drop policy if exists activity_read on public.activity_events;
create policy activity_read
on public.activity_events for select to authenticated
using (
  visibility = 'public'
  or public.can_read_community()
);

drop policy if exists notifications_own on public.notifications;
create policy notifications_own
on public.notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select on public.profiles to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.project_info to authenticated;
grant select on public.activity_events to authenticated;
grant select, update on public.notifications to authenticated;

-- Backfill owner profiles from linked flats
insert into public.profiles (user_id, role, flat_id, display_name)
select f.user_id, 'owner', f.id, f.owner_name
from public.flats f
where f.user_id is not null
on conflict (user_id) do update
set
  role = excluded.role,
  flat_id = excluded.flat_id,
  display_name = coalesce(public.profiles.display_name, excluded.display_name);
