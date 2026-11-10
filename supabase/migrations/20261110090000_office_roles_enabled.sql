-- Association / super chooses which outside-office roles this society uses.
-- Admins then assign people into those roles with the existing roles forms.

alter table public.project_info
  add column if not exists office_roles jsonb not null default '["admin","builder","committee","facility","staff","security"]'::jsonb;

update public.project_info
set office_roles = '["admin","builder","committee","facility","staff","security"]'::jsonb
where id = 1
  and (office_roles is null or jsonb_typeof(office_roles) <> 'array' or jsonb_array_length(office_roles) = 0);

create or replace function public.office_roles_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_array(
    jsonb_build_object('value', 'admin', 'label', 'Admin'),
    jsonb_build_object('value', 'builder', 'label', 'Builder'),
    jsonb_build_object('value', 'committee', 'label', 'Committee'),
    jsonb_build_object('value', 'facility', 'label', 'Facility manager'),
    jsonb_build_object('value', 'staff', 'label', 'Service staff'),
    jsonb_build_object('value', 'security', 'label', 'Security')
  );
$$;

revoke all on function public.office_roles_catalog() from public, anon;
grant execute on function public.office_roles_catalog() to authenticated;

create or replace function public.enabled_office_roles()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  raw jsonb;
  allowed text[] := array['admin','builder','committee','facility','staff','security'];
  picked text[] := '{}';
  item text;
begin
  select office_roles into raw from public.project_info where id = 1;
  if raw is null or jsonb_typeof(raw) <> 'array' then
    return allowed;
  end if;
  for item in
    select jsonb_array_elements_text(raw)
  loop
    if item = any(allowed) and not (item = any(picked)) then
      picked := array_append(picked, item);
    end if;
  end loop;
  if coalesce(array_length(picked, 1), 0) = 0 then
    return allowed;
  end if;
  -- Admin role stays available for platform assignment even if unchecked elsewhere.
  if not ('admin' = any(picked)) then
    picked := array_prepend('admin', picked);
  end if;
  return picked;
end;
$$;

revoke all on function public.enabled_office_roles() from public, anon;
grant execute on function public.enabled_office_roles() to authenticated;

create or replace function public.set_office_roles_enabled(next_roles text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array['admin','builder','committee','facility','staff','security'];
  picked text[] := '{}';
  item text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only super admin can choose which office roles this society uses.';
  end if;
  if next_roles is null then
    raise exception 'Pick at least one office role.';
  end if;
  foreach item in array next_roles
  loop
    if item = any(allowed) and not (item = any(picked)) then
      picked := array_append(picked, item);
    end if;
  end loop;
  if coalesce(array_length(picked, 1), 0) = 0 then
    raise exception 'Pick at least one office role.';
  end if;
  if not ('admin' = any(picked)) then
    picked := array_prepend('admin', picked);
  end if;
  update public.project_info
  set office_roles = to_jsonb(picked), updated_at = now()
  where id = 1;
  if not found then
    raise exception 'Project info is missing.';
  end if;
  return jsonb_build_object('ok', true, 'roles', to_jsonb(picked));
end;
$$;

revoke all on function public.set_office_roles_enabled(text[]) from public, anon;
grant execute on function public.set_office_roles_enabled(text[]) to authenticated;

create or replace function public.list_office_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  roles jsonb := '[]'::jsonb;
  people jsonb;
  super boolean := public.is_platform_admin();
  enabled text[] := public.enabled_office_roles();
  catalog jsonb := public.office_roles_catalog();
  item jsonb;
begin
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;

  for item in select * from jsonb_array_elements(catalog)
  loop
    if (item->>'value') = any(enabled)
       and (super or (item->>'value') <> 'admin') then
      roles := roles || jsonb_build_array(item);
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_rank, x.name), '[]'::jsonb)
    into people
  from (
    select
      u.id::text as user_id,
      case
        when nullif(trim(p.display_name), '') is not null
          and trim(p.display_name) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then trim(p.display_name)
        when nullif(trim(u.email), '') is not null
          then split_part(trim(u.email), '@', 1)
        else 'Signed-in person'
      end as name,
      coalesce(u.email, '') as email,
      coalesce(p.role, 'visitor') as role,
      case
        when coalesce(p.role, 'visitor') = 'admin' then 'Admin'
        when coalesce(p.role, 'visitor') = 'builder' then 'Builder'
        when coalesce(p.role, 'visitor') = 'committee' then 'Committee'
        when coalesce(p.role, 'visitor') = 'facility' then 'Facility manager'
        when coalesce(p.role, 'visitor') = 'staff' then 'Service staff'
        when coalesce(p.role, 'visitor') = 'security' then 'Security'
        when coalesce(p.role, 'visitor') = 'owner' then 'Owner'
        when coalesce(p.role, 'visitor') = 'co_owner' then 'Family'
        when coalesce(p.role, 'visitor') = 'tenant' then 'Tenant'
        when exists (
          select 1 from public.person_roles pr
          where pr.user_id = u.id and pr.role in ('owner', 'co_owner', 'tenant')
        ) then 'Home member'
        when nullif(trim(u.email), '') is not null then 'Signed in · no home yet'
        else 'Visitor'
      end as role_label,
      coalesce(
        f.flat_number,
        (
          select fl.flat_number
          from public.person_roles pr
          join public.flats fl on fl.id = pr.flat_id
          where pr.user_id = u.id
            and pr.role in ('owner', 'co_owner', 'tenant')
            and pr.flat_id is not null
          order by case pr.role when 'owner' then 1 when 'co_owner' then 2 else 3 end
          limit 1
        )
      ) as flat_number,
      (
        coalesce(p.role, 'visitor') = any(enabled)
        or exists (
          select 1 from public.person_roles pr
          where pr.user_id = u.id
            and pr.role = any(enabled)
        )
      ) as office,
      coalesce((
        select jsonb_agg(pr.role order by pr.role)
        from public.person_roles pr
        where pr.user_id = u.id
      ), '[]'::jsonb) as held_roles,
      case
        when coalesce(p.role, 'visitor') = any(enabled)
          or exists (
            select 1 from public.person_roles pr
            where pr.user_id = u.id
              and pr.role = any(enabled)
          ) then 1
        when coalesce(p.role, 'visitor') in ('owner', 'co_owner', 'tenant')
          or exists (
            select 1 from public.person_roles pr
            where pr.user_id = u.id and pr.role in ('owner', 'co_owner', 'tenant')
          ) then 2
        else 3
      end as sort_rank
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.flats f on f.id = p.flat_id
    where u.id is distinct from auth.uid()
      and nullif(trim(u.email), '') is not null
      and not exists (
        select 1 from public.platform_admins pa
        where lower(pa.email) = lower(u.email)
      )
  ) x;

  return jsonb_build_object(
    'roles', roles,
    'people', people,
    'can_assign_admin', super,
    'enabled_roles', to_jsonb(enabled),
    'catalog', catalog
  );
end;
$$;

revoke all on function public.list_office_people() from public, anon;
grant execute on function public.list_office_people() to authenticated;

create or replace function public.assign_office_role(
  target_user uuid,
  next_role text,
  display_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  current_role text;
  current_flat bigint;
  label text;
  super boolean := public.is_platform_admin();
  enabled text[] := public.enabled_office_roles();
begin
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;
  if target_user is null then
    raise exception 'Choose a person.';
  end if;
  if target_user = auth.uid() then
    raise exception 'You cannot change your own role here.';
  end if;

  if next_role is null or not (next_role = any(enabled)) then
    raise exception 'That office role is not used by this society.';
  end if;
  if not super and next_role = 'admin' then
    raise exception 'Only a super admin can change a society admin.';
  end if;

  select email into target_email from auth.users where id = target_user;
  if target_email is null then
    raise exception 'That person is not in the portal yet.';
  end if;
  if exists (
    select 1 from public.platform_admins where lower(email) = lower(target_email)
  ) then
    raise exception 'A super admin account cannot be changed here.';
  end if;

  select role, flat_id into current_role, current_flat
  from public.profiles where user_id = target_user;

  if coalesce(current_role, 'visitor') = 'admin' and not super then
    raise exception 'Only a super admin can change a society admin.';
  end if;

  if current_flat is not null
     and current_role in ('owner', 'co_owner', 'tenant') then
    insert into public.person_roles (user_id, role, flat_id)
    values (target_user, current_role, current_flat)
    on conflict (user_id, role) do update set flat_id = excluded.flat_id;
  end if;

  insert into public.person_roles (user_id, role, flat_id)
  values (target_user, next_role, null)
  on conflict (user_id, role) do update set flat_id = null;

  insert into public.profiles (user_id, role, flat_id, display_name)
  values (
    target_user,
    next_role,
    null,
    nullif(trim(display_name), '')
  )
  on conflict (user_id) do update
    set role = excluded.role,
        flat_id = null,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  update public.flats set user_id = null where user_id = target_user;

  label := case next_role
    when 'admin' then 'Admin'
    when 'builder' then 'Builder'
    when 'committee' then 'Committee'
    when 'facility' then 'Facility manager'
    when 'staff' then 'Service staff'
    when 'security' then 'Security'
    else next_role
  end;

  return jsonb_build_object(
    'ok', true,
    'message', label || ' saved.',
    'role', next_role,
    'roleLabel', label
  );
end;
$$;

revoke all on function public.assign_office_role(uuid, text, text) from public, anon;
grant execute on function public.assign_office_role(uuid, text, text) to authenticated;
