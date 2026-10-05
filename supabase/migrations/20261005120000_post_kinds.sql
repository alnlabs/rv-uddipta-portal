alter table public.member_posts
  add column if not exists kind text not null default 'update';

alter table public.member_posts
  drop constraint if exists member_posts_kind_check;

alter table public.member_posts
  add constraint member_posts_kind_check
  check (kind in ('update', 'question', 'sale', 'lost', 'event'));
