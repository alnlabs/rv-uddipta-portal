-- Residents can ask to connect with another home. Phones stay masked until
-- people share them outside the app; connect is an introduction + inbox note.

create table if not exists public.connection_requests (
  id bigint generated always as identity primary key,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  from_flat_id bigint references public.flats (id) on delete set null,
  to_flat_id bigint not null references public.flats (id) on delete cascade,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'refused', 'cancelled')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by uuid references auth.users (id) on delete set null
);

create unique index if not exists connection_requests_open_pair
  on public.connection_requests (from_user_id, to_flat_id)
  where status = 'pending';

create index if not exists connection_requests_to_flat_idx
  on public.connection_requests (to_flat_id, status);

alter table public.connection_requests enable row level security;

revoke all on public.connection_requests from public, anon, authenticated;

grant select, insert, update on public.connection_requests to authenticated;

create or replace function public.can_see_connection(request public.connection_requests)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    request.from_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.flat_id = request.to_flat_id
    )
    or exists (
      select 1 from public.person_roles r
      where r.user_id = auth.uid() and r.flat_id = request.to_flat_id
    )
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.flat_id = request.from_flat_id
    );
$$;

drop policy if exists connection_requests_select on public.connection_requests;
create policy connection_requests_select on public.connection_requests
  for select to authenticated
  using (public.can_see_connection(connection_requests));

drop policy if exists connection_requests_insert on public.connection_requests;
create policy connection_requests_insert on public.connection_requests
  for insert to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists connection_requests_update on public.connection_requests;
create policy connection_requests_update on public.connection_requests
  for update to authenticated
  using (public.can_see_connection(connection_requests))
  with check (public.can_see_connection(connection_requests));
