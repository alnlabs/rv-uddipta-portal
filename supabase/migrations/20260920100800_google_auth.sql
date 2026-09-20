alter table public.registration_requests
  add column if not exists email text;

create unique index if not exists registration_open_user_idx
  on public.registration_requests (user_id)
  where status in ('pending', 'approved') and user_id is not null;
