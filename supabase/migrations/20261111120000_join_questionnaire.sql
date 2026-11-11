-- Join questionnaire: home + work request kinds, why note, optional flat for work.

alter table public.registration_requests
  add column if not exists intent_path text,
  add column if not exists why_note text;

alter table public.registration_requests
  alter column flat_number drop not null,
  alter column floor drop not null,
  alter column unit drop not null,
  alter column type drop not null;

update public.registration_requests
set intent_path = case
  when request_kind in ('builder', 'security', 'staff', 'facility', 'committee') then 'work'
  else 'home'
end
where intent_path is null;

alter table public.registration_requests
  drop constraint if exists registration_requests_request_kind_check;

alter table public.registration_requests
  add constraint registration_requests_request_kind_check
  check (request_kind in (
    'owner', 'family', 'tenant',
    'builder', 'security', 'staff', 'facility', 'committee'
  ));

alter table public.registration_requests
  drop constraint if exists registration_requests_intent_path_check;

alter table public.registration_requests
  add constraint registration_requests_intent_path_check
  check (intent_path is null or intent_path in ('home', 'work'));

drop function if exists public.submit_registration(text, text, text, text);
drop function if exists public.submit_registration(text, text, text, text, text);

create or replace function public.submit_registration(
  kind text,
  phone text,
  owner_name text,
  flat_number text default '',
  why_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  flat public.flats%rowtype;
  my_email text;
  normalized_phone text;
  path text;
  note text := nullif(trim(why_note), '');
  wanted_flat text := nullif(upper(trim(flat_number)), '');
  has_flat boolean := false;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if public.is_platform_admin() then
    raise exception 'Super admin accounts cannot claim a flat.';
  end if;

  if kind in ('owner', 'family', 'tenant') then
    path := 'home';
  elsif kind in ('builder', 'security', 'staff', 'facility', 'committee') then
    path := 'work';
  else
    raise exception 'Pick who you are.';
  end if;

  normalized_phone := public.normalize_phone(phone);
  if normalized_phone is null then
    raise exception 'Enter a valid 10-digit phone number.';
  end if;
  if length(trim(owner_name)) < 2 then
    raise exception 'Your name is too short.';
  end if;
  if note is null or length(note) < 3 then
    raise exception 'Tell us briefly why you need access.';
  end if;

  if path = 'home' then
    if wanted_flat is null then
      raise exception 'Enter a brochure flat such as A101 or B1004.';
    end if;
    select * into flat from public.flats where flats.flat_number = wanted_flat;
    if not found then raise exception 'Flat not found.'; end if;
    has_flat := true;
  elsif wanted_flat is not null then
    select * into flat from public.flats where flats.flat_number = wanted_flat;
    if not found then raise exception 'Flat not found.'; end if;
    has_flat := true;
  end if;

  if exists (
    select 1 from public.registration_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'A registration is already waiting for admin approval.';
  end if;

  if path = 'home' and kind = 'owner' and has_flat and exists (
    select 1 from public.registration_requests
    where flat_number = flat.flat_number
      and status = 'pending'
      and request_kind = 'owner'
  ) then
    raise exception 'That flat already has a pending owner request.';
  end if;

  select email into my_email from auth.users where id = auth.uid();

  insert into public.registration_requests (
    user_id, email, phone, owner_name, flat_number, floor, unit, type,
    status, request_kind, intent_path, why_note
  ) values (
    auth.uid(),
    my_email,
    normalized_phone,
    trim(owner_name),
    case when has_flat then flat.flat_number else null end,
    case when has_flat then coalesce(flat.floor, 0) else null end,
    case when has_flat then coalesce(flat.unit, 0) else null end,
    case when has_flat then coalesce(flat.type, '') else null end,
    'pending',
    kind,
    path,
    note
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'flatNumber', case when has_flat then flat.flat_number else null end,
    'kind', kind,
    'path', path,
    'message', 'Request sent to the office.'
  );
end;
$$;

revoke all on function public.submit_registration(text, text, text, text, text) from public, anon;
grant execute on function public.submit_registration(text, text, text, text, text) to authenticated;

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
  if profile.flat_id is not null then
    select flat_number into home from public.flats where id = profile.flat_id;
  end if;

  select status, flat_number, request_kind, reject_reason, intent_path, why_note
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
      'path', coalesce(req.intent_path, 'home'),
      'whyNote', coalesce(req.why_note, ''),
      'reason', coalesce(req.reject_reason, '')
    ) end
  );
end;
$$;

revoke all on function public.load_my_registration() from public, anon;
grant execute on function public.load_my_registration() to authenticated;

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
    'home', coalesce(r.flat_number, ''),
    'name', coalesce(r.owner_name, ''),
    'email', coalesce(r.email, ''),
    'phone', coalesce(r.phone, ''),
    'kind', coalesce(r.request_kind, 'owner'),
    'path', coalesce(r.intent_path, 'home'),
    'whyNote', coalesce(r.why_note, ''),
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
  path text;
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

  path := coalesce(req.intent_path, case
    when req.request_kind in ('builder', 'security', 'staff', 'facility', 'committee') then 'work'
    else 'home'
  end);

  next_role := case coalesce(req.request_kind, 'owner')
    when 'family' then 'co_owner'
    when 'tenant' then 'tenant'
    when 'builder' then 'builder'
    when 'security' then 'security'
    when 'staff' then 'staff'
    when 'facility' then 'facility'
    when 'committee' then 'committee'
    else 'owner'
  end;

  if path = 'work' then
    insert into public.profiles (user_id, role, flat_id, display_name)
    values (req.user_id, next_role, null, coalesce(req.owner_name, req.email))
    on conflict (user_id) do update
      set role = excluded.role,
          flat_id = null,
          display_name = coalesce(excluded.display_name, public.profiles.display_name);

    insert into public.person_roles (user_id, role, flat_id)
    values (req.user_id, next_role, null)
    on conflict (user_id, role) do update set flat_id = null;

    update public.flats set user_id = null where user_id = req.user_id;
  else
    select * into flat from public.flats where flat_number = req.flat_number;
    if not found then raise exception 'Flat not found.'; end if;

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
  end if;

  update public.registration_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id;

  return jsonb_build_object('message', 'Request approved.', 'status', 'approved', 'role', next_role);
end;
$$;

revoke all on function public.decide_registration(bigint, text, text) from public, anon;
grant execute on function public.decide_registration(bigint, text, text) to authenticated;
