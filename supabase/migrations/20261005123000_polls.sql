alter table public.member_posts
  drop constraint if exists member_posts_kind_check;

alter table public.member_posts
  add constraint member_posts_kind_check
  check (kind in ('update', 'question', 'sale', 'lost', 'event', 'poll'));

create table if not exists public.member_poll_options (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.member_posts (id) on delete cascade,
  label text not null,
  position integer not null
);

create index if not exists member_poll_options_post_idx
  on public.member_poll_options (post_id, position);

create table if not exists public.member_poll_votes (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.member_posts (id) on delete cascade,
  option_id bigint not null references public.member_poll_options (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists member_poll_votes_option_idx
  on public.member_poll_votes (option_id);

alter table public.member_poll_options enable row level security;
alter table public.member_poll_votes enable row level security;

revoke all on public.member_poll_options from public, anon, authenticated;
revoke all on public.member_poll_votes from public, anon, authenticated;
