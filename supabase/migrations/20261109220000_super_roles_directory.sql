-- Super admin (and society admin) directory: every signed-in apartment person,
-- with home + held office roles, assign and clear office roles.

create or replace function public.list_office_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  roles jsonb;
  people jsonb;
  super boolean := public.is_platform_admin();
begin
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;

  if super then
    roles := jsonb_build_array(
      jsonb_build_object('value', 'admin', 'label', 'Admin'),
      jsonb_build_object('value', 'builder', 'label', 'Builder'),
      jsonb_build_object('value', 'committee', 'label', 'Committee'),
      jsonb_build_object('value', 'facility', 'label', 'Facility manager'),
      jsonb_build_object('value', 'staff', 'label', 'Service staff'),
      jsonb_build_object('value', 'security', 'label', 'Security')
    );
  else
    roles := jsonb_build_array(
      jsonb_build_object('value', 'builder', 'label', 'Builder'),
      jsonb_build_object('value', 'committee', 'label', 'Committee'),
      jsonb_build_object('value', 'facility', 'label', 'Facility manager'),
      jsonb_build_object('value', 'staff', 'label', 'Service staff'),
      jsonb_build_object('value', 'security', 'label', 'Security')
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.name), '[]'::jsonb)
  into people
  from (
    select
      u.id::text as "userId",
      coalesce(nullif(p.display_name, ''), split_part(coalesce(u.email, ''), '@', 1), 'Signed-in person') as name,
      coalesce(u.email, '') as email,
      coalesce(p.role, 'visitor') as role,
      case coalesce(p.role, 'visitor')
        when 'admin' then 'Admin'
        when 'builder' then 'Builder'
        when 'committee' then 'Committee'
        when 'facility' then 'Facility manager'
        when 'staff' then 'Service staff'
        when 'security' then 'Security'
        when 'owner' then 'Owner'
        when 'co_owner' then 'Family'
        when 'tenant' then 'Tenant'
        else coalesce(p.role, 'Visitor')
      end as "roleLabel",
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
      ) as "flatNumber",
      (
        coalesce(p.role, 'visitor') in ('admin', 'builder', 'committee', 'facility', 'staff', 'security')
        or exists (
          select 1 from public.person_roles pr
          where pr.user_id = u.id
            and pr.role in ('admin', 'builder', 'committee', 'facility', 'staff', 'security')
        )
      ) as office,
      coalesce((
        select jsonb_agg(pr.role order by pr.role)
        from public.person_roles pr
        where pr.user_id = u.id
      ), '[]'::jsonb) as "heldRoles"
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.flats f on f.id = p.flat_id
    where u.id is distinct from auth.uid()
      and not exists (
        select 1 from public.platform_admins pa
        where lower(pa.email) = lower(coalesce(u.email, ''))
      )
  ) x;

  return jsonb_build_object(
    'roles', roles,
    'people', people,
    'canAssignAdmin', super
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

  if super then
    if next_role not in ('admin', 'builder', 'committee', 'facility', 'staff', 'security') then
      raise exception 'Pick an office role.';
    end if;
  else
    if next_role not in ('builder', 'committee', 'facility', 'staff', 'security') then
      raise exception 'Society admin can assign facility, security, committee, staff, or builder.';
    end if;
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

  -- Keep home membership when giving an office desk.
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

create or replace function public.clear_office_role(target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  current_role text;
  home_role text;
  home_flat bigint;
  had_office boolean;
  super boolean := public.is_platform_admin();
begin
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;
  if target_user is null or target_user = auth.uid() then
    raise exception 'Choose another person.';
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

  select role into current_role from public.profiles where user_id = target_user;
  if coalesce(current_role, 'visitor') = 'admin' and not super then
    raise exception 'Only a super admin can clear a society admin.';
  end if;

  select exists (
    select 1 from public.person_roles
    where user_id = target_user
      and role in ('admin', 'builder', 'committee', 'facility', 'staff', 'security')
  ) or coalesce(current_role, 'visitor') in ('admin', 'builder', 'committee', 'facility', 'staff', 'security')
  into had_office;

  if not had_office then
    raise exception 'That person does not have an office role.';
  end if;

  delete from public.person_roles
  where user_id = target_user
    and role in ('admin', 'builder', 'committee', 'facility', 'staff', 'security');

  select role, flat_id into home_role, home_flat
  from public.person_roles
  where user_id = target_user
    and role in ('owner', 'co_owner', 'tenant')
  order by case role when 'owner' then 1 when 'co_owner' then 2 else 3 end
  limit 1;

  if home_role is not null then
    update public.profiles
    set role = home_role, flat_id = home_flat
    where user_id = target_user;
    if home_role = 'owner' and home_flat is not null then
      update public.flats set user_id = target_user where id = home_flat;
    end if;
  else
    update public.profiles
    set role = 'visitor', flat_id = null
    where user_id = target_user;
  end if;

  return jsonb_build_object('ok', true, 'message', 'Office role removed.');
end;
$$;

revoke all on function public.clear_office_role(uuid) from public, anon;
grant execute on function public.clear_office_role(uuid) to authenticated;
