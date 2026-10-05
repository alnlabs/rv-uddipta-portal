alter table public.notifications
  add column if not exists seen_at timestamptz;

update public.notifications
set seen_at = read_at
where read_at is not null
  and seen_at is null;

create index if not exists notifications_user_unseen_idx
  on public.notifications (user_id, created_at desc)
  where seen_at is null;
