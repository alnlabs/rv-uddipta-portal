-- Launch date, visit bookings, member posts, requests, and family registration.

alter table public.project_info
  add column if not exists launch_date text;

alter table public.registration_requests
  add column if not exists request_kind text not null default 'owner';

alter table public.registration_requests
  drop constraint if exists registration_requests_request_kind_check;

alter table public.registration_requests
  add constraint registration_requests_request_kind_check
  check (request_kind in ('owner', 'family'));

drop index if exists public.registration_open_flat_idx;

create unique index if not exists registration_open_owner_flat_idx
  on public.registration_requests (flat_number)
  where status in ('pending', 'approved') and request_kind = 'owner';

create table if not exists public.visit_requests (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.member_posts (
  id bigint generated always as identity primary key,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists member_posts_created_idx
  on public.member_posts (created_at desc);

create table if not exists public.member_replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.member_posts (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  flat_number text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists member_replies_post_idx
  on public.member_replies (post_id, created_at);

create table if not exists public.member_notes (
  id bigint generated always as identity primary key,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  flat_id bigint references public.flats (id) on delete set null,
  flat_number text,
  author_name text not null,
  kind text not null check (kind in ('request', 'feedback')),
  body text not null,
  admin_reply text,
  status text not null default 'open' check (status in ('open', 'done', 'read')),
  created_at timestamptz not null default now()
);

create index if not exists member_notes_kind_idx
  on public.member_notes (kind, status, created_at desc);

alter table public.visit_requests enable row level security;
alter table public.member_posts enable row level security;
alter table public.member_replies enable row level security;
alter table public.member_notes enable row level security;

revoke all on public.visit_requests from public, anon, authenticated;
revoke all on public.member_posts from public, anon, authenticated;
revoke all on public.member_replies from public, anon, authenticated;
revoke all on public.member_notes from public, anon, authenticated;
