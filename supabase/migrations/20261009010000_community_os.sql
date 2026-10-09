-- Community operating desks: roles, switches, requests, gate, parking,
-- amenities, maintenance, committee, audit, reports support, papers, settings.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'admin', 'builder', 'owner', 'co_owner', 'visitor', 'tenant',
    'committee', 'facility', 'staff', 'security'
  ));

alter table public.profiles drop constraint if exists profiles_flat_role_check;
alter table public.profiles
  add constraint profiles_flat_role_check
  check (
    (role in ('admin', 'builder', 'visitor', 'committee', 'facility', 'staff', 'security') and flat_id is null)
    or (role in ('owner', 'co_owner', 'tenant') and flat_id is not null)
    or (role in ('admin', 'builder') and flat_id is not null)
  );

create table if not exists public.community_features (
  key text primary key,
  label text not null,
  feature_group text not null,
  summary text not null default '',
  enabled boolean not null default true
);

insert into public.community_features (key, label, feature_group, summary, enabled)
values
  ('feed', 'Community feed', 'Community', 'Posts and discussion.', true),
  ('announcements', 'Announcements', 'Community', 'Official notices.', true),
  ('events', 'Events', 'Community', 'Gatherings and RSVPs.', true),
  ('polls', 'Polls', 'Community', 'Votes from residents.', true),
  ('forms', 'Forms', 'Community', 'One answer per home.', true),
  ('neighbours', 'Neighbours', 'Home', 'Who lives in each home.', true),
  ('requests', 'Requests', 'Services', 'Tracked help and feedback.', true),
  ('visitor_passes', 'Visitor passes', 'Visitors', 'A pass for someone coming to a home.', true),
  ('gate', 'Security gate', 'Visitors', 'Who is waiting, inside, and expected.', true),
  ('parking', 'Parking', 'Parking', 'Vehicles, bays, and visitor bays.', true),
  ('inbox', 'Inbox', 'Communication', 'Notifications and messages.', true),
  ('building', 'Building', 'Building', 'Floors, plans, and the 3D view.', true),
  ('amenities', 'Amenities', 'Services', 'Book a shared space.', true),
  ('maintenance', 'Maintenance', 'Services', 'Jobs for the team.', true),
  ('committee', 'Committee', 'Community', 'Decisions for the committee.', true),
  ('documents', 'Home papers', 'Home', 'Possession and verification papers.', true)
on conflict (key) do nothing;

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  module text not null check (module in ('community', 'request')),
  value text not null,
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  unique (module, value)
);

insert into public.categories (module, value, label, sort_order)
values
  ('community', 'update', 'Update', 10),
  ('community', 'question', 'Question', 20),
  ('community', 'quote', 'Quote', 30),
  ('community', 'celebration', 'Celebration', 40),
  ('community', 'sale', 'For sale', 50),
  ('community', 'wanted', 'Wanted', 60),
  ('community', 'giveaway', 'Giveaway', 70),
  ('community', 'lost', 'Lost & found', 80),
  ('community', 'recommendation', 'Recommendation', 90),
  ('community', 'parking', 'Parking note', 100),
  ('community', 'event', 'Event', 110),
  ('community', 'poll', 'Poll', 120),
  ('community', 'alert', 'Alert', 130),
  ('community', 'emergency', 'Emergency', 140),
  ('request', 'request', 'Request', 10),
  ('request', 'feedback', 'Feedback', 20)
on conflict (module, value) do nothing;

alter table public.member_notes drop constraint if exists member_notes_status_check;
update public.member_notes set status = 'new' where status = 'open';
update public.member_notes set status = 'waiting' where status = 'read';
alter table public.member_notes
  add constraint member_notes_status_check
  check (status in ('new', 'in_progress', 'waiting', 'done'));

alter table public.member_notes alter column status set default 'new';

create table if not exists public.visitor_passes (
  id bigint generated always as identity primary key,
  code text not null unique,
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text not null,
  host_user_id uuid references auth.users (id) on delete set null,
  visitor_name text not null,
  visitor_phone text,
  purpose text,
  visit_on date not null default current_date,
  status text not null default 'expected'
    check (status in ('pending_approval', 'expected', 'waiting', 'inside', 'left', 'refused')),
  bay_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  plate text not null,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.parking_bays (
  id bigint generated always as identity primary key,
  label text not null unique,
  kind text not null check (kind in ('resident', 'visitor')),
  flat_id bigint references public.flats (id) on delete set null
);

insert into public.parking_bays (label, kind)
values
  ('Visitor 1', 'visitor'),
  ('Visitor 2', 'visitor'),
  ('Visitor 3', 'visitor'),
  ('Visitor 4', 'visitor'),
  ('Visitor 5', 'visitor'),
  ('Visitor 6', 'visitor')
on conflict (label) do nothing;

alter table public.visitor_passes
  drop constraint if exists visitor_passes_bay_id_fkey;
alter table public.visitor_passes
  add constraint visitor_passes_bay_id_fkey
  foreign key (bay_id) references public.parking_bays (id) on delete set null;

create table if not exists public.amenities (
  id bigint generated always as identity primary key,
  name text not null unique,
  hours_note text not null default '',
  enabled boolean not null default true
);

insert into public.amenities (name, hours_note)
values
  ('Gymnasium', '6:00–21:00'),
  ('Multipurpose hall', 'Book a day ahead'),
  ('Guest rooms', 'Ask the office'),
  ('Children''s play area', 'Daylight hours'),
  ('Cricket pitch', 'Morning and evening'),
  ('Basketball practice', 'Evening')
on conflict (name) do nothing;

create table if not exists public.amenity_bookings (
  id bigint generated always as identity primary key,
  amenity_id bigint not null references public.amenities (id) on delete cascade,
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text,
  user_id uuid references auth.users (id) on delete set null,
  resident_name text not null,
  starts_on date not null,
  slot text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'refused')),
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id bigint generated always as identity primary key,
  title text not null,
  place text not null default '',
  body text not null default '',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done')),
  assignee_user_id uuid references auth.users (id) on delete set null,
  source_note_id bigint references public.member_notes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.committee_items (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  kind text not null default 'policy'
    check (kind in ('policy', 'budget', 'vote')),
  status text not null default 'open'
    check (status in ('open', 'decided')),
  decision text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_name text not null default '',
  action text not null,
  subject text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.home_documents (
  id bigint generated always as identity primary key,
  flat_id bigint not null references public.flats (id) on delete cascade,
  title text not null,
  kind text not null default 'other'
    check (kind in ('possession', 'verification', 'other')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role text not null,
  feature_key text not null references public.community_features (key) on delete cascade,
  access text not null check (access in ('none', 'view', 'manage')),
  primary key (role, feature_key)
);

alter table public.project_info
  add column if not exists emergency_contacts text not null default '',
  add column if not exists gate_rules text not null default '',
  add column if not exists host_approval boolean not null default true;

alter table public.community_features enable row level security;
alter table public.categories enable row level security;
alter table public.visitor_passes enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_bays enable row level security;
alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;
alter table public.work_orders enable row level security;
alter table public.committee_items enable row level security;
alter table public.audit_log enable row level security;
alter table public.home_documents enable row level security;
alter table public.role_permissions enable row level security;

revoke all on public.community_features from public, anon, authenticated;
revoke all on public.categories from public, anon, authenticated;
revoke all on public.visitor_passes from public, anon, authenticated;
revoke all on public.vehicles from public, anon, authenticated;
revoke all on public.parking_bays from public, anon, authenticated;
revoke all on public.amenities from public, anon, authenticated;
revoke all on public.amenity_bookings from public, anon, authenticated;
revoke all on public.work_orders from public, anon, authenticated;
revoke all on public.committee_items from public, anon, authenticated;
revoke all on public.audit_log from public, anon, authenticated;
revoke all on public.home_documents from public, anon, authenticated;
revoke all on public.role_permissions from public, anon, authenticated;
