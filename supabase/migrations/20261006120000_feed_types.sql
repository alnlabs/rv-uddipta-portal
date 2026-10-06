alter table public.member_posts
  drop constraint if exists member_posts_kind_check;

alter table public.member_posts
  add constraint member_posts_kind_check
  check (kind in (
    'update',
    'question',
    'sale',
    'lost',
    'event',
    'poll',
    'alert',
    'recommendation',
    'wanted',
    'giveaway',
    'parking',
    'quote',
    'celebration',
    'emergency'
  ));

alter table public.member_posts
  add column if not exists topic text;

alter table public.member_posts
  drop constraint if exists member_posts_topic_check;

alter table public.member_posts
  add constraint member_posts_topic_check
  check (
    (
      kind = 'emergency'
      and topic in ('medical', 'fire', 'security', 'lift', 'gas', 'water', 'power')
    )
    or (kind <> 'emergency' and topic is null)
  );
