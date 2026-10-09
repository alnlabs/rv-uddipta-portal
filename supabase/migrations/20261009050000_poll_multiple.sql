alter table public.member_posts
  add column if not exists poll_multiple boolean not null default false;

alter table public.member_poll_votes
  drop constraint if exists member_poll_votes_post_id_user_id_key;

alter table public.member_poll_votes
  drop constraint if exists member_poll_votes_post_user_option_key;

alter table public.member_poll_votes
  add constraint member_poll_votes_post_user_option_key unique (post_id, user_id, option_id);
