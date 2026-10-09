create table if not exists public.person_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  flat_id bigint references public.flats (id) on delete set null,
  primary key (user_id, role),
  constraint person_roles_role_check check (role in (
    'admin', 'builder', 'owner', 'co_owner', 'visitor', 'tenant',
    'committee', 'facility', 'staff', 'security'
  ))
);

insert into public.person_roles (user_id, role, flat_id)
select user_id, role, flat_id
from public.profiles
where role is not null
on conflict (user_id, role) do nothing;

alter table public.person_roles enable row level security;
revoke all on public.person_roles from public, anon, authenticated;
