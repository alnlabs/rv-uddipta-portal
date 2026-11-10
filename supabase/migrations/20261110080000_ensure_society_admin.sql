-- Ensure helpers used by roles RPCs exist (safe if phone_desks already applied).

create table if not exists public.platform_admins (
  email text primary key
);

insert into public.platform_admins (email)
values ('alnlabs.com@gmail.com')
on conflict (email) do nothing;

revoke all on public.platform_admins from public, anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    join auth.users u on lower(u.email) = lower(pa.email)
    where u.id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.is_society_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
    or exists (
      select 1 from public.person_roles
      where user_id = auth.uid() and role = 'admin'
    );
$$;

revoke all on function public.is_society_admin() from public, anon;
grant execute on function public.is_society_admin() to authenticated;
