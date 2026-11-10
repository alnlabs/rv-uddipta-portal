-- Phone desks: authenticated SECURITY DEFINER RPCs so mobile never needs Vercel.

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

create or replace function public.current_profile_role_safe()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where user_id = auth.uid()), 'visitor');
$$;

create or replace function public.require_role(allowed text[])
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if public.is_platform_admin() then
    return 'admin';
  end if;
  actor := public.current_profile_role_safe();
  if not (actor = any (allowed)) then
    raise exception 'This is not available on your account.';
  end if;
  return actor;
end;
$$;

-- Features -------------------------------------------------------------------

create or replace function public.list_my_features()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  keys text[] := array[]::text[];
  row record;
  access text;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;
  if public.is_platform_admin() then
    select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
      into access
    from public.community_features
    where enabled;
    return coalesce(access, '[]'::jsonb);
  end if;
  actor := public.current_profile_role_safe();
  if actor = 'visitor' then
    return '["inbox","announcements"]'::jsonb;
  end if;
  for row in
    select key from public.community_features where enabled order by key
  loop
    access := public.phone_access(row.key);
    if access is distinct from 'none' then
      keys := array_append(keys, row.key);
    end if;
  end loop;
  return to_jsonb(keys);
end;
$$;

revoke all on function public.list_my_features() from public, anon;
grant execute on function public.list_my_features() to authenticated;

-- Device tokens --------------------------------------------------------------

create or replace function public.register_my_device(push_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if push_token is null
     or (
       push_token not like 'ExponentPushToken[%'
       and push_token not like 'ExpoPushToken[%'
     ) then
    raise exception 'That is not a phone token.';
  end if;
  insert into public.device_tokens (user_id, token)
  values (auth.uid(), push_token)
  on conflict (token) do update set user_id = excluded.user_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.register_my_device(text) from public, anon;
grant execute on function public.register_my_device(text) to authenticated;

-- Roles desk (super + society admin) -----------------------------------------

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
    );
$$;

revoke all on function public.is_society_admin() from public, anon;
grant execute on function public.is_society_admin() to authenticated;

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
  if not public.is_society_admin() then
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
    -- Society admin: apartment team roles only (not society admin itself).
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
      coalesce(nullif(p.display_name, ''), u.email, 'Signed-in person') as name,
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
        else coalesce(p.role, 'visitor')
      end as "roleLabel",
      f.flat_number as "flatNumber",
      (coalesce(p.role, 'visitor') in ('admin','builder','committee','facility','staff','security')) as office
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.flats f on f.id = p.flat_id
    where not exists (
      select 1 from public.platform_admins pa
      where lower(pa.email) = lower(u.email)
    )
    and u.id <> auth.uid()
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
  if not public.is_society_admin() then
    raise exception 'Only admin can manage team roles.';
  end if;
  if target_user is null then
    raise exception 'Choose a person.';
  end if;
  if target_user = auth.uid() then
    raise exception 'You cannot change your own role here.';
  end if;

  if super then
    if next_role not in ('admin','builder','committee','facility','staff','security') then
      raise exception 'Pick an office role.';
    end if;
  else
    if next_role not in ('builder','committee','facility','staff','security') then
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

  if current_flat is not null
     and current_role in ('owner','co_owner','tenant') then
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
  super boolean := public.is_platform_admin();
begin
  if not public.is_society_admin() then
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
  if coalesce(current_role, 'visitor') not in ('admin','builder','committee','facility','staff','security') then
    raise exception 'That person does not have an office role.';
  end if;

  delete from public.person_roles
  where user_id = target_user
    and role in ('admin','builder','committee','facility','staff','security');

  select role, flat_id into home_role, home_flat
  from public.person_roles
  where user_id = target_user
    and role in ('owner','co_owner','tenant')
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

-- Amenities ------------------------------------------------------------------

create or replace function public.list_amenities_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  can_decide boolean;
  my_flat bigint;
  my_home text;
  amenities jsonb;
  mine jsonb;
  pending jsonb := '[]'::jsonb;
  slots jsonb := jsonb_build_array(
    jsonb_build_object('value', 'morning', 'label', 'Morning'),
    jsonb_build_object('value', 'afternoon', 'label', 'Afternoon'),
    jsonb_build_object('value', 'evening', 'label', 'Evening')
  );
begin
  actor := public.require_role(array['owner','co_owner','tenant','admin','facility','committee','staff','security','builder']);
  perform public.phone_require('amenities', 'view');
  can_decide := actor in ('admin', 'facility') and public.phone_access('amenities') = 'manage';

  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  select flat_number into my_home from public.flats where id = my_flat;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'hours', coalesce(a.hours_note, '')
  ) order by a.name), '[]'::jsonb)
  into amenities
  from public.amenities a
  where a.enabled;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'amenityId', b.amenity_id,
    'home', coalesce(b.flat_number, ''),
    'who', coalesce(b.resident_name, ''),
    'when', b.starts_on::text,
    'slot', b.slot,
    'status', b.status,
    'space', coalesce(a.name, '')
  ) order by b.starts_on, b.id), '[]'::jsonb)
  into mine
  from public.amenity_bookings b
  left join public.amenities a on a.id = b.amenity_id
  where b.user_id = auth.uid()
    and b.starts_on >= current_date
    and b.status in ('pending', 'confirmed');

  if can_decide then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'amenityId', b.amenity_id,
      'home', coalesce(b.flat_number, ''),
      'who', coalesce(b.resident_name, ''),
      'when', b.starts_on::text,
      'slot', b.slot,
      'status', b.status,
      'space', coalesce(a.name, '')
    ) order by b.starts_on, b.id), '[]'::jsonb)
    into pending
    from public.amenity_bookings b
    left join public.amenities a on a.id = b.amenity_id
    where b.status = 'pending'
      and b.starts_on >= current_date;
  end if;

  return jsonb_build_object(
    'canBook', my_flat is not null and public.phone_access('amenities') = 'manage',
    'canDecide', can_decide,
    'slots', slots,
    'amenities', amenities,
    'pending', pending,
    'mine', mine,
    'home', my_home
  );
end;
$$;

revoke all on function public.list_amenities_desk() from public, anon;
grant execute on function public.list_amenities_desk() to authenticated;

create or replace function public.book_amenity(amenity_id bigint, starts_on date, slot text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_flat bigint;
  my_home text;
  my_name text;
begin
  perform public.require_role(array['owner','co_owner','tenant','admin']);
  perform public.phone_require('amenities', 'manage');
  select flat_id, display_name into my_flat, my_name from public.profiles where user_id = auth.uid();
  if my_flat is null then raise exception 'Link a home first.'; end if;
  select flat_number into my_home from public.flats where id = my_flat;
  if exists (
    select 1 from public.amenity_bookings
    where amenity_bookings.amenity_id = book_amenity.amenity_id
      and amenity_bookings.starts_on = book_amenity.starts_on
      and amenity_bookings.slot = book_amenity.slot
      and status in ('pending', 'confirmed')
  ) then
    raise exception 'That slot is already taken.';
  end if;
  insert into public.amenity_bookings (
    amenity_id, flat_id, flat_number, user_id, resident_name, starts_on, slot, status
  ) values (
    amenity_id, my_flat, my_home, auth.uid(), coalesce(my_name, ''), starts_on, slot, 'pending'
  );
  return jsonb_build_object('ok', true, 'message', 'Booking sent for confirmation.');
end;
$$;

revoke all on function public.book_amenity(bigint, date, text) from public, anon;
grant execute on function public.book_amenity(bigint, date, text) to authenticated;

create or replace function public.decide_booking(booking_id bigint, next_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('amenities', 'manage');
  if next_status not in ('confirmed', 'refused') then
    raise exception 'Pick confirmed or refused.';
  end if;
  update public.amenity_bookings
  set status = next_status
  where id = booking_id and status = 'pending';
  if not found then raise exception 'That booking is not waiting.'; end if;
  return jsonb_build_object('ok', true, 'message', 'Booking updated.');
end;
$$;

revoke all on function public.decide_booking(bigint, text) from public, anon;
grant execute on function public.decide_booking(bigint, text) to authenticated;

create or replace function public.save_amenity_hours(amenity_id bigint, hours text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('amenities', 'manage');
  update public.amenities set hours_note = hours where id = amenity_id;
  if not found then raise exception 'Amenity not found.'; end if;
  return jsonb_build_object('ok', true, 'message', 'Hours saved.');
end;
$$;

revoke all on function public.save_amenity_hours(bigint, text) from public, anon;
grant execute on function public.save_amenity_hours(bigint, text) to authenticated;

-- Parking --------------------------------------------------------------------

create or replace function public.list_my_parking()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  my_flat bigint;
  my_home text;
  vehicles jsonb;
  bays jsonb;
begin
  actor := public.require_role(array['owner','co_owner','tenant','admin','facility']);
  perform public.phone_require('parking', 'view');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  select flat_number into my_home from public.flats where id = my_flat;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id, 'plate', v.plate, 'label', coalesce(v.label, '')
  ) order by v.id), '[]'::jsonb)
  into vehicles
  from public.vehicles v
  where v.flat_id = my_flat;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'label', b.label,
    'kind', b.kind,
    'home', f.flat_number
  ) order by b.label), '[]'::jsonb)
  into bays
  from public.parking_bays b
  left join public.flats f on f.id = b.flat_id;

  return jsonb_build_object(
    'canManage', my_flat is not null and public.phone_access('parking') = 'manage',
    'home', my_home,
    'vehicles', coalesce(vehicles, '[]'::jsonb),
    'bays', coalesce(bays, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_my_parking() from public, anon;
grant execute on function public.list_my_parking() to authenticated;

create or replace function public.save_my_vehicle(plate text, label text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_flat bigint;
begin
  perform public.require_role(array['owner','co_owner','tenant','admin']);
  perform public.phone_require('parking', 'manage');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  if my_flat is null then raise exception 'Link a home first.'; end if;
  insert into public.vehicles (flat_id, plate, label)
  values (my_flat, upper(trim(plate)), coalesce(trim(label), ''));
  return jsonb_build_object('ok', true, 'message', 'Vehicle saved.');
end;
$$;

revoke all on function public.save_my_vehicle(text, text) from public, anon;
grant execute on function public.save_my_vehicle(text, text) to authenticated;

create or replace function public.remove_my_vehicle(vehicle_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
  my_flat bigint;
begin
  actor := public.require_role(array['owner','co_owner','tenant','admin']);
  perform public.phone_require('parking', 'manage');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  if actor = 'admin' then
    delete from public.vehicles where id = vehicle_id;
  else
    delete from public.vehicles where id = vehicle_id and flat_id = my_flat;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.remove_my_vehicle(bigint) from public, anon;
grant execute on function public.remove_my_vehicle(bigint) to authenticated;

-- Office approvals -----------------------------------------------------------

create or replace function public.list_waiting_approvals()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  waiting jsonb;
begin
  perform public.require_role(array['admin']);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'home', r.flat_number,
    'name', coalesce(r.owner_name, ''),
    'email', coalesce(r.email, ''),
    'phone', coalesce(r.phone, ''),
    'kind', coalesce(r.request_kind, 'owner'),
    'createdAt', r.created_at
  ) order by r.created_at), '[]'::jsonb)
  into waiting
  from public.registration_requests r
  where r.status = 'pending'
  limit 40;
  return jsonb_build_object('waiting', waiting);
end;
$$;

revoke all on function public.list_waiting_approvals() from public, anon;
grant execute on function public.list_waiting_approvals() to authenticated;

create or replace function public.decide_registration(
  request_id bigint,
  next_action text,
  reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.registration_requests%rowtype;
  flat public.flats%rowtype;
  next_role text;
begin
  perform public.require_role(array['admin']);
  select * into req from public.registration_requests where id = request_id for update;
  if not found then raise exception 'Request not found.'; end if;
  if req.status <> 'pending' then raise exception 'That request is already decided.'; end if;

  if next_action = 'reject' then
    update public.registration_requests
    set status = 'rejected',
        reject_reason = nullif(trim(reason), ''),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = request_id;
    return jsonb_build_object('message', 'Request refused.', 'status', 'rejected');
  end if;

  if next_action <> 'approve' then
    raise exception 'Pick approve or reject.';
  end if;

  select * into flat from public.flats where flat_number = req.flat_number;
  if not found then raise exception 'Flat not found.'; end if;

  next_role := case coalesce(req.request_kind, 'owner')
    when 'family' then 'co_owner'
    when 'tenant' then 'tenant'
    else 'owner'
  end;

  if next_role = 'owner' then
    update public.flats
    set user_id = req.user_id,
        owner_name = coalesce(req.owner_name, owner_name),
        email = coalesce(req.email, email),
        phone = coalesce(req.phone, phone),
        sale_status = 'sold',
        occupancy = 'owner_stay'
    where id = flat.id;
  end if;

  insert into public.profiles (user_id, role, flat_id, display_name)
  values (req.user_id, next_role, flat.id, coalesce(req.owner_name, req.email))
  on conflict (user_id) do update
    set role = excluded.role,
        flat_id = excluded.flat_id,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  insert into public.person_roles (user_id, role, flat_id)
  values (req.user_id, next_role, flat.id)
  on conflict (user_id, role) do update set flat_id = excluded.flat_id;

  update public.registration_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id;

  return jsonb_build_object('message', 'Request approved.', 'status', 'approved');
end;
$$;

revoke all on function public.decide_registration(bigint, text, text) from public, anon;
grant execute on function public.decide_registration(bigint, text, text) to authenticated;

-- Office requests ------------------------------------------------------------

create or replace function public.list_office_requests(note_kind text default 'request')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  people jsonb;
  requests jsonb;
begin
  perform public.require_role(array['admin']);
  perform public.phone_require('requests', 'view');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id::text,
    'name', coalesce(p.display_name, p.role)
  ) order by p.display_name), '[]'::jsonb)
  into people
  from public.profiles p
  where p.role in ('staff', 'facility');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'who', coalesce(n.author_name, ''),
    'home', coalesce(n.flat_number, ''),
    'body', coalesce(n.body, ''),
    'status', coalesce(n.status, 'new'),
    'statusLabel', initcap(replace(coalesce(n.status, 'new'), '_', ' ')),
    'date', n.created_at,
    'imageUrl', coalesce(n.image_url, ''),
    'assigneeId', w.assignee_user_id::text,
    'assigneeName', ap.display_name,
    'jobId', w.id,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'who', coalesce(m.author_name, ''),
        'body', coalesce(m.body, ''),
        'fromOffice', coalesce(m.from_office, false)
      ) order by m.id)
      from public.note_messages m where m.note_id = n.id
    ), '[]'::jsonb)
  ) order by n.created_at desc), '[]'::jsonb)
  into requests
  from public.member_notes n
  left join lateral (
    select * from public.work_orders wo where wo.source_note_id = n.id order by wo.id desc limit 1
  ) w on true
  left join public.profiles ap on ap.user_id = w.assignee_user_id
  where n.kind = note_kind
  limit 60;

  return jsonb_build_object(
    'canManage', public.phone_access('requests') = 'manage',
    'canOpenJob', public.phone_access('maintenance') = 'manage',
    'kind', note_kind,
    'people', people,
    'requests', requests
  );
end;
$$;

revoke all on function public.list_office_requests(text) from public, anon;
grant execute on function public.list_office_requests(text) to authenticated;

create or replace function public.office_request_action(
  action text,
  note_id bigint,
  reply text default null,
  next_status text default null,
  assignee uuid default null,
  title text default null,
  place text default null,
  body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_name text;
  existing_job bigint;
begin
  perform public.require_role(array['admin']);
  perform public.phone_require('requests', 'manage');
  select display_name into my_name from public.profiles where user_id = auth.uid();

  if action = 'reply' then
    update public.member_notes
    set admin_reply = reply, status = 'waiting'
    where id = note_id;
    insert into public.note_messages (note_id, author_user_id, author_name, body, from_office)
    values (note_id, auth.uid(), coalesce(my_name, 'Office'), coalesce(reply, ''), true);
    return jsonb_build_object('message', 'Reply sent.');
  end if;

  if action = 'status' then
    if next_status not in ('new','in_progress','waiting','done') then
      raise exception 'Bad status.';
    end if;
    update public.member_notes set status = next_status where id = note_id;
    return jsonb_build_object('message', 'Status updated.');
  end if;

  if action = 'assign' then
    select id into existing_job from public.work_orders where source_note_id = note_id order by id desc limit 1;
    if existing_job is null then
      insert into public.work_orders (title, place, body, status, assignee_user_id, source_note_id)
      select coalesce(left(n.body, 80), 'Office request'), coalesce(n.flat_number, ''), coalesce(n.body, ''),
             'in_progress', assignee, n.id
      from public.member_notes n where n.id = note_id;
    else
      update public.work_orders
      set assignee_user_id = assignee, status = 'in_progress'
      where id = existing_job;
    end if;
    update public.member_notes set status = 'in_progress' where id = note_id;
    return jsonb_build_object('message', 'Assigned.');
  end if;

  if action = 'job' then
    select id into existing_job from public.work_orders where source_note_id = note_id order by id desc limit 1;
    if existing_job is null then
      insert into public.work_orders (title, place, body, status, source_note_id)
      values (coalesce(nullif(title, ''), 'Job'), coalesce(place, ''), coalesce(body, ''), 'open', note_id);
    else
      update public.work_orders
      set title = coalesce(nullif(title, ''), title),
          place = coalesce(place, place),
          body = coalesce(body, body)
      where id = existing_job;
    end if;
    update public.member_notes set status = 'in_progress' where id = note_id;
    return jsonb_build_object('message', 'Job saved.');
  end if;

  raise exception 'Unknown action.';
end;
$$;

revoke all on function public.office_request_action(text, bigint, text, text, uuid, text, text, text) from public, anon;
grant execute on function public.office_request_action(text, bigint, text, text, uuid, text, text, text) to authenticated;

-- Jobs desk ------------------------------------------------------------------

create or replace function public.list_jobs_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  people jsonb;
  jobs jsonb;
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'view');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id::text,
    'name', coalesce(p.display_name, p.role),
    'onDuty', coalesce(p.on_duty, false)
  ) order by p.display_name), '[]'::jsonb)
  into people
  from public.profiles p
  where p.role in ('staff', 'facility');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'place', coalesce(w.place, ''),
    'body', coalesce(w.body, ''),
    'status', w.status,
    'state', w.status,
    'assigneeId', w.assignee_user_id::text,
    'who', coalesce(ap.display_name, '')
  ) order by w.id desc), '[]'::jsonb)
  into jobs
  from public.work_orders w
  left join public.profiles ap on ap.user_id = w.assignee_user_id
  limit 40;

  return jsonb_build_object(
    'canManage', public.phone_access('maintenance') = 'manage',
    'people', people,
    'jobs', jobs
  );
end;
$$;

revoke all on function public.list_jobs_desk() from public, anon;
grant execute on function public.list_jobs_desk() to authenticated;

create or replace function public.set_on_duty(person_id uuid, on_duty boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  update public.profiles set on_duty = set_on_duty.on_duty where user_id = person_id;
  return jsonb_build_object('ok', true, 'message', 'Duty updated.');
end;
$$;

revoke all on function public.set_on_duty(uuid, boolean) from public, anon;
grant execute on function public.set_on_duty(uuid, boolean) to authenticated;

create or replace function public.open_job(title text, place text default '', body text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  insert into public.work_orders (title, place, body, status)
  values (coalesce(nullif(title, ''), 'Job'), coalesce(place, ''), coalesce(body, ''), 'open');
  return jsonb_build_object('ok', true, 'message', 'Job opened.');
end;
$$;

revoke all on function public.open_job(text, text, text) from public, anon;
grant execute on function public.open_job(text, text, text) to authenticated;

create or replace function public.assign_job(
  job_id bigint,
  assignee uuid default null,
  next_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  update public.work_orders
  set assignee_user_id = coalesce(assignee, assignee_user_id),
      status = coalesce(next_status, status)
  where id = job_id;
  if next_status = 'done' then
    update public.member_notes n
    set status = 'done'
    from public.work_orders w
    where w.id = job_id and w.source_note_id = n.id;
  end if;
  return jsonb_build_object('ok', true, 'message', 'Job updated.');
end;
$$;

revoke all on function public.assign_job(bigint, uuid, text) from public, anon;
grant execute on function public.assign_job(bigint, uuid, text) to authenticated;

-- Committee ------------------------------------------------------------------

create or replace function public.list_committee_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  items jsonb;
begin
  perform public.require_role(array['admin','committee']);
  perform public.phone_require('committee', 'view');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'body', coalesce(c.body, ''),
    'kind', c.kind,
    'status', c.status,
    'decision', coalesce(c.decision, '')
  ) order by c.id desc), '[]'::jsonb)
  into items
  from public.committee_items c
  limit 40;
  return jsonb_build_object(
    'canManage', public.phone_access('committee') = 'manage',
    'items', items
  );
end;
$$;

revoke all on function public.list_committee_desk() from public, anon;
grant execute on function public.list_committee_desk() to authenticated;

create or replace function public.decide_committee(
  item_id bigint,
  title text,
  body text,
  kind text,
  decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['admin','committee']);
  perform public.phone_require('committee', 'manage');
  if kind not in ('policy','budget','vote') then
    raise exception 'Bad kind.';
  end if;
  if item_id is null or item_id = 0 then
    insert into public.committee_items (title, body, kind, decision, status)
    values (title, body, kind, decision, case when nullif(decision,'') is null then 'open' else 'decided' end);
  else
    update public.committee_items
    set title = decide_committee.title,
        body = decide_committee.body,
        kind = decide_committee.kind,
        decision = decide_committee.decision,
        status = case when nullif(decide_committee.decision,'') is null then 'open' else 'decided' end
    where id = item_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.decide_committee(bigint, text, text, text, text) from public, anon;
grant execute on function public.decide_committee(bigint, text, text, text, text) to authenticated;

-- Gate walk-in ---------------------------------------------------------------

create or replace function public.gate_walk_in(
  visitor_name text,
  flat_number text,
  purpose text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  flat public.flats%rowtype;
  host uuid;
  code text;
  new_id bigint;
  who text;
  told integer := 0;
begin
  perform public.require_role(array['admin','security']);
  perform public.phone_require('gate', 'manage');
  if nullif(trim(visitor_name), '') is null then
    raise exception 'Enter the guest name.';
  end if;
  select * into flat from public.flats where flats.flat_number = upper(trim(gate_walk_in.flat_number));
  if not found then
    select * into flat from public.flats where flats.flat_number ilike trim(gate_walk_in.flat_number);
  end if;
  if not found then raise exception 'Flat not found.'; end if;
  select user_id into host from public.profiles where flat_id = flat.id and role in ('owner','co_owner','tenant') limit 1;
  host := coalesce(host, flat.user_id, auth.uid());
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  who := trim(visitor_name);
  insert into public.visitor_passes (
    code, flat_id, flat_number, host_user_id, visitor_name, purpose, visit_on, status
  ) values (
    code, flat.id, flat.flat_number, host, who, coalesce(nullif(trim(purpose), ''), 'Unplanned guest'), current_date, 'waiting'
  ) returning id into new_id;

  -- Notify everyone linked to that home (unplanned guest at the gate).
  insert into public.notifications (user_id, kind, title, body, href)
  select
    p.user_id,
    'visitor',
    'Guest at the gate',
    who || ' is waiting for ' || flat.flat_number,
    '/pass/' || new_id::text
  from public.profiles p
  where p.flat_id = flat.id;
  get diagnostics told = row_count;

  if told = 0 and host is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      host,
      'visitor',
      'Guest at the gate',
      who || ' is waiting for ' || flat.flat_number,
      '/pass/' || new_id::text
    );
  end if;

  return jsonb_build_object('code', code, 'id', new_id, 'home', flat.flat_number);
end;
$$;

revoke all on function public.gate_walk_in(text, text, text) from public, anon;
grant execute on function public.gate_walk_in(text, text, text) to authenticated;

-- Neighbours -----------------------------------------------------------------

create or replace function public.list_neighbours(q text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  my_flat bigint;
  my_home text;
  homes jsonb;
  needle text := lower(trim(coalesce(q, '')));
begin
  perform public.require_role(array['owner','co_owner','tenant','admin','committee','facility','staff','security','builder']);
  perform public.phone_require('neighbours', 'view');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  select flat_number into my_home from public.flats where id = my_flat;

  select coalesce(jsonb_agg(jsonb_build_object(
    'home', f.flat_number,
    'flatId', f.id,
    'wing', coalesce(f.wing, ''),
    'floor', coalesce(f.floor, 0),
    'type', coalesce(f.type, ''),
    'owner', coalesce(f.owner_name, ''),
    'photo', coalesce(f.owner_photo_url, ''),
    'phone', coalesce(f.phone_masked, ''),
    'tenant', coalesce(f.tenant_name, ''),
    'tenantPhone', coalesce(f.tenant_phone_masked, ''),
    'occupancy', coalesce(f.occupancy, ''),
    'mine', (f.id = my_flat),
    'registered', exists (
      select 1 from public.profiles p where p.flat_id = f.id
    ) or exists (
      select 1 from public.flats fl where fl.id = f.id and fl.user_id is not null
    )
  ) order by f.wing, f.floor, f.flat_number), '[]'::jsonb)
  into homes
  from public.flats_public f
  where coalesce(f.sale_status, 'sold') = 'sold'
    and (
      needle = ''
      or lower(f.flat_number) like '%' || needle || '%'
      or lower(coalesce(f.owner_name, '')) like '%' || needle || '%'
      or lower(coalesce(f.wing, '')) like '%' || needle || '%'
    )
  limit 200;

  return jsonb_build_object('flat', my_home, 'homes', homes);
end;
$$;

revoke all on function public.list_neighbours(text) from public, anon;
grant execute on function public.list_neighbours(text) to authenticated;

create or replace function public.request_connection(
  action text,
  target_home text default null,
  note text default null,
  request_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  my_flat bigint;
  to_flat bigint;
  new_id bigint;
begin
  perform public.require_role(array['owner','co_owner','tenant','admin']);
  perform public.phone_require('neighbours', 'manage');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  if my_flat is null then raise exception 'Link a home first.'; end if;

  if action in ('accept', 'refuse') then
    update public.connection_requests
    set status = case when action = 'accept' then 'accepted' else 'refused' end,
        answered_at = now(),
        answered_by = auth.uid()
    where id = request_id
      and to_flat_id = my_flat
      and status = 'pending';
    if not found then raise exception 'Request not found.'; end if;
    return jsonb_build_object('message', 'Updated.', 'status', action);
  end if;

  select id into to_flat from public.flats where flat_number = target_home;
  if to_flat is null then raise exception 'Home not found.'; end if;
  if to_flat = my_flat then raise exception 'That is your home.'; end if;

  insert into public.connection_requests (from_user_id, from_flat_id, to_flat_id, note, status)
  values (auth.uid(), my_flat, to_flat, coalesce(note, ''), 'pending')
  returning id into new_id;

  return jsonb_build_object('message', 'Request sent.', 'status', 'pending', 'requestId', new_id);
end;
$$;

revoke all on function public.request_connection(text, text, text, bigint) from public, anon;
grant execute on function public.request_connection(text, text, text, bigint) to authenticated;

-- Registration claim ---------------------------------------------------------

create or replace function public.load_my_registration()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile public.profiles%rowtype;
  home text;
  req record;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into profile from public.profiles where user_id = auth.uid();
  select flat_number into home from public.flats where id = profile.flat_id;
  select status, flat_number, request_kind, reject_reason
    into req
  from public.registration_requests
  where user_id = auth.uid()
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'flatNumber', home,
    'role', coalesce(profile.role, 'visitor'),
    'name', coalesce(profile.display_name, ''),
    'request', case when req.status is null then null else jsonb_build_object(
      'status', req.status,
      'flatNumber', req.flat_number,
      'kind', coalesce(req.request_kind, 'owner'),
      'reason', coalesce(req.reject_reason, '')
    ) end
  );
end;
$$;

revoke all on function public.load_my_registration() from public, anon;
grant execute on function public.load_my_registration() to authenticated;

create or replace function public.submit_registration(
  kind text,
  phone text,
  owner_name text,
  flat_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  flat public.flats%rowtype;
  my_email text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.is_platform_admin() then
    raise exception 'Super admin accounts cannot claim a flat.';
  end if;
  if kind not in ('owner', 'family', 'tenant') then
    raise exception 'Pick owner, family, or tenant.';
  end if;
  select * into flat from public.flats where flats.flat_number = submit_registration.flat_number;
  if not found then raise exception 'Flat not found.'; end if;
  select email into my_email from auth.users where id = auth.uid();

  insert into public.registration_requests (
    user_id, email, phone, owner_name, flat_number, floor, unit, type, status, request_kind
  ) values (
    auth.uid(),
    my_email,
    phone,
    owner_name,
    flat.flat_number,
    coalesce(flat.floor, 0),
    coalesce(flat.unit, 0),
    coalesce(flat.type, ''),
    'pending',
    case kind when 'family' then 'family' when 'tenant' then 'tenant' else 'owner' end
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'flatNumber', flat.flat_number,
    'message', 'Claim sent to the office.'
  );
end;
$$;

revoke all on function public.submit_registration(text, text, text, text) from public, anon;
grant execute on function public.submit_registration(text, text, text, text) to authenticated;

-- Publish notice -------------------------------------------------------------

create or replace function public.publish_notice(
  kind text,
  title text,
  body text default '',
  starts_on date default null,
  pin boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
  payload jsonb := '{}'::jsonb;
begin
  perform public.require_role(array['admin']);
  perform public.phone_require('announcements', 'manage');
  if kind not in ('announcement', 'maintenance', 'meeting') then
    raise exception 'Bad notice kind.';
  end if;
  if starts_on is not null then
    payload := jsonb_build_object('startsOn', starts_on::text);
  end if;
  insert into public.activity_events (
    actor_user_id, kind, title, body, payload, visibility, pinned
  ) values (
    auth.uid(), kind, title, coalesce(body, ''), payload, 'community', coalesce(pin, false)
  ) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id, 'message', 'Notice published.');
end;
$$;

revoke all on function public.publish_notice(text, text, text, date, boolean) from public, anon;
grant execute on function public.publish_notice(text, text, text, date, boolean) to authenticated;

-- Create community form ------------------------------------------------------

create or replace function public.create_community_form(
  title text,
  note text default '',
  visibility text default 'private',
  results_view text default 'community',
  ask_signin boolean default true,
  questions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text;
  new_id bigint;
  q jsonb;
  i int := 0;
  choice_text text;
  choice_list text[];
  view_key text;
begin
  perform public.require_role(array['admin']);
  perform public.phone_require('forms', 'manage');
  slug := lower(regexp_replace(coalesce(title, 'query'), '[^a-zA-Z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug) || '-' || substr(md5(random()::text), 1, 6);
  view_key := case coalesce(results_view, 'community')
    when 'admins' then 'admins'
    when 'own' then 'own'
    when 'link' then 'link'
    else 'community'
  end;

  insert into public.enquiries (slug, title, note, visibility, ask_signin, results_view, created_by)
  values (
    slug,
    title,
    coalesce(note, ''),
    coalesce(visibility, 'private'),
    coalesce(ask_signin, true),
    view_key,
    auth.uid()
  ) returning id into new_id;

  for q in select * from jsonb_array_elements(coalesce(questions, '[]'::jsonb))
  loop
    i := i + 1;
    choice_text := coalesce(q->>'choices', '');
    if choice_text = '' then
      choice_list := '{}';
    else
      choice_list := string_to_array(choice_text, ',');
    end if;
    insert into public.enquiry_fields (enquiry_id, sort_order, kind, label, required, choices)
    values (
      new_id,
      i,
      coalesce(q->>'kind', 'text'),
      coalesce(q->>'label', 'Question'),
      coalesce((q->>'required')::boolean, false),
      choice_list
    );
  end loop;

  return jsonb_build_object('ok', true, 'id', new_id, 'message', 'Query created.');
end;
$$;

revoke all on function public.create_community_form(text, text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.create_community_form(text, text, text, text, boolean, jsonb) to authenticated;
