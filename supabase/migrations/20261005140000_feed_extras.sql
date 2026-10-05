alter table public.member_posts
  add column if not exists image_url text;

alter table public.member_posts
  add column if not exists starts_on date;

alter table public.member_posts
  add column if not exists closed_at timestamptz;

alter table public.member_posts
  add column if not exists sold_at timestamptz;

create table if not exists public.member_post_reactions (
  post_id bigint not null references public.member_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('helpful', 'thanks')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.member_event_rsvps (
  post_id bigint not null references public.member_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.activity_events
  add column if not exists pinned boolean not null default false;

create index if not exists activity_events_pinned_idx
  on public.activity_events (pinned, created_at desc);

alter table public.member_post_reactions enable row level security;
alter table public.member_event_rsvps enable row level security;

revoke all on public.member_post_reactions from public, anon, authenticated;
revoke all on public.member_event_rsvps from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
