-- Heal visitor profiles when the office already linked the Google login / owner email
-- to a sold flat (common after "just exploring" then admin assigns the home).

create or replace function public.ensure_my_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  actor public.profiles%rowtype;
  home public.flats%rowtype;
  held_role text;
  held_flat bigint;
  mail text;
  next_role text;
  next_flat bigint;
  next_name text;
begin
  if me is null then
    raise exception 'Sign in first.';
  end if;

  if public.is_platform_admin() then
    return jsonb_build_object('ok', true, 'role', 'admin', 'flatId', null);
  end if;

  select * into actor from public.profiles where user_id = me;
  if not found then
    insert into public.profiles (user_id, role, flat_id, display_name)
    values (me, 'visitor', null, null)
    returning * into actor;
  end if;

  if actor.flat_id is not null and actor.role is distinct from 'visitor' then
    return jsonb_build_object(
      'ok', true,
      'role', actor.role,
      'flatId', actor.flat_id,
      'healed', false
    );
  end if;

  select * into home from public.flats where user_id = me limit 1;
  if home.id is null then
    mail := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
    if mail <> '' then
      select * into home
      from public.flats
      where sale_status = 'sold'
        and email is not null
        and lower(trim(email)) = mail
        and (user_id is null or user_id = me)
      order by id
      limit 1;
      if home.id is not null and home.user_id is null then
        update public.flats set user_id = me where id = home.id and user_id is null;
        home.user_id := me;
      end if;
    end if;
  end if;

  if home.id is not null then
    next_role := 'owner';
    next_flat := home.id;
    next_name := coalesce(nullif(trim(actor.display_name), ''), home.owner_name);
  else
    select role, flat_id into held_role, held_flat
    from public.person_roles
    where user_id = me
      and role in ('owner', 'co_owner', 'tenant')
      and flat_id is not null
    order by case role when 'owner' then 0 when 'co_owner' then 1 else 2 end
    limit 1;
    if held_flat is null then
      return jsonb_build_object(
        'ok', true,
        'role', actor.role,
        'flatId', actor.flat_id,
        'healed', false
      );
    end if;
    next_role := held_role;
    next_flat := held_flat;
    next_name := actor.display_name;
  end if;

  update public.profiles
  set role = next_role,
      flat_id = next_flat,
      display_name = coalesce(next_name, display_name)
  where user_id = me;

  insert into public.person_roles (user_id, role, flat_id)
  values (me, next_role, next_flat)
  on conflict (user_id, role) do update set flat_id = excluded.flat_id;

  if next_role = 'owner' then
    update public.flats set user_id = null where user_id = me and id is distinct from next_flat;
    update public.flats set user_id = me where id = next_flat;
  end if;

  return jsonb_build_object(
    'ok', true,
    'role', next_role,
    'flatId', next_flat,
    'healed', true
  );
end;
$$;

revoke all on function public.ensure_my_home() from public, anon;
grant execute on function public.ensure_my_home() to authenticated;
