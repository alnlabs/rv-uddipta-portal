-- Gate desk is security-only (society admin / platform admin do not run Gate).

create or replace function public.phone_access(feature text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_role text;
  turned_on boolean;
  saved text;
begin
  if auth.uid() is null then
    return 'none';
  end if;

  actor_role := public.current_profile_role_safe();

  select enabled into turned_on from public.community_features where key = feature;
  if turned_on is false then
    return 'none';
  end if;

  -- Gate stays with security even for admin / platform / permission rows.
  if feature = 'gate' then
    return case when actor_role = 'security' then 'manage' else 'none' end;
  end if;

  if public.is_platform_admin() then
    return 'manage';
  end if;

  if actor_role is null or actor_role = 'visitor' then
    return 'none';
  end if;

  select access into saved
  from public.role_permissions
  where role = actor_role and feature_key = feature;
  if saved in ('none', 'view', 'manage') then
    return saved;
  end if;

  if actor_role = 'admin' then
    return 'manage';
  end if;

  if feature = 'maintenance' then
    return case when actor_role in ('facility', 'staff') then 'manage' else 'none' end;
  end if;

  if feature = 'committee' then
    return case when actor_role = 'committee' then 'manage' else 'none' end;
  end if;

  if actor_role not in (
    'owner', 'co_owner', 'tenant', 'committee', 'facility', 'staff', 'security', 'builder'
  ) then
    return 'none';
  end if;

  if feature = 'documents' then
    if actor_role in ('owner', 'co_owner') then
      return 'manage';
    end if;
    if actor_role = 'tenant' then
      return 'view';
    end if;
    return 'none';
  end if;

  if exists (select 1 from public.community_features where key = feature) then
    return 'manage';
  end if;

  return 'none';
end;
$$;

create or replace function public.gate_set_status(pass_id bigint, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.visitor_passes%rowtype;
begin
  if public.current_profile_role() <> 'security' then
    raise exception 'The gate is for security.';
  end if;
  if next_status not in ('waiting', 'inside', 'left') then
    raise exception 'Choose waiting, inside, or left.';
  end if;
  select * into row from public.visitor_passes where id = pass_id;
  if not found then
    raise exception 'That pass was not found.';
  end if;
  if row.status in ('refused', 'cancelled') then
    raise exception 'This pass is not valid.';
  end if;
  if next_status = 'waiting' and row.status not in ('expected', 'waiting') then
    raise exception 'This pass is not ready for the gate.';
  end if;
  if next_status = 'inside' then
    if row.status = 'pending_approval' then
      raise exception 'The resident has not allowed this visit.';
    end if;
    if row.visit_on <> current_date then
      raise exception 'This pass is not valid today.';
    end if;
    if row.status = 'waiting' and coalesce(row.host_answer, '') <> 'allowed' then
      if coalesce((select host_approval from public.project_info where id = 1), true) then
        raise exception 'Wait for the resident to allow this visitor.';
      end if;
    end if;
  end if;
  if next_status = 'waiting' and row.status = 'waiting' then
    return;
  end if;
  update public.visitor_passes set status = next_status where id = pass_id;
  if next_status = 'waiting' and row.host_user_id is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      row.host_user_id,
      'visitor',
      'Visitor at the gate',
      row.visitor_name || ' is waiting for ' || row.flat_number,
      '/history'
    );
  end if;
end;
$$;

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
  perform public.require_role(array['security']);
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
