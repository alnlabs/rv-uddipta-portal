-- Direct phone calls: security/admin can dial any home; connected residents
-- can dial each other. Security never receives a displayable number in the UI
-- contract (showNumber=false); the dial value is only for the device tel: sheet.

create or replace function public.flats_are_connected(a bigint, b bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select a is not null
    and b is not null
    and a <> b
    and exists (
      select 1
      from public.connection_requests c
      where c.status = 'accepted'
        and (
          (c.from_flat_id = a and c.to_flat_id = b)
          or (c.from_flat_id = b and c.to_flat_id = a)
        )
    );
$$;

revoke all on function public.flats_are_connected(bigint, bigint) from public, anon;
grant execute on function public.flats_are_connected(bigint, bigint) to authenticated;

create or replace function public.neighbour_link(target_flat_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  my_flat bigint;
  row public.connection_requests%rowtype;
  incoming boolean := false;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  actor := public.current_profile_role_safe();
  select flat_id into my_flat from public.profiles where user_id = auth.uid();

  if my_flat is not null and my_flat = target_flat_id then
    return jsonb_build_object(
      'status', 'mine',
      'requestId', null,
      'incoming', false,
      'canCall', actor in ('admin', 'security')
    );
  end if;

  if actor in ('admin', 'security') then
    return jsonb_build_object(
      'status', null,
      'requestId', null,
      'incoming', false,
      'canCall', true
    );
  end if;

  if public.flats_are_connected(my_flat, target_flat_id) then
    return jsonb_build_object(
      'status', 'accepted',
      'requestId', null,
      'incoming', false,
      'canCall', true
    );
  end if;

  select * into row
  from public.connection_requests c
  where c.status = 'pending'
    and (
      (c.from_user_id = auth.uid() and c.to_flat_id = target_flat_id)
      or (my_flat is not null and c.to_flat_id = my_flat and c.from_flat_id = target_flat_id)
    )
  order by c.created_at desc
  limit 1;

  if found then
    incoming := row.to_flat_id = my_flat and row.from_user_id is distinct from auth.uid();
    return jsonb_build_object(
      'status', 'pending',
      'requestId', row.id,
      'incoming', incoming,
      'canCall', false
    );
  end if;

  return jsonb_build_object(
    'status', null,
    'requestId', null,
    'incoming', false,
    'canCall', false
  );
end;
$$;

revoke all on function public.neighbour_link(bigint) from public, anon;
grant execute on function public.neighbour_link(bigint) to authenticated;

create or replace function public.resolve_call(
  target_home text,
  which text default 'owner'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  my_flat bigint;
  flat public.flats%rowtype;
  raw text;
  digits text;
  dial text;
  show_number boolean := false;
  allowed boolean := false;
  label text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  actor := public.current_profile_role_safe();
  if actor is null or actor = 'visitor' then
    return jsonb_build_object('ok', false, 'reason', 'Calling is not available on this account.');
  end if;

  select * into flat
  from public.flats
  where flat_number = upper(trim(target_home));
  if not found then
    select * into flat
    from public.flats
    where flat_number ilike trim(target_home);
  end if;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'Home not found.');
  end if;

  select flat_id into my_flat from public.profiles where user_id = auth.uid();

  if actor in ('admin', 'security') then
    allowed := true;
  elsif actor in ('owner', 'co_owner', 'tenant') then
    allowed := my_flat = flat.id or public.flats_are_connected(my_flat, flat.id);
  end if;

  if not allowed then
    return jsonb_build_object('ok', false, 'reason', 'Connect with this home before calling.');
  end if;

  if lower(coalesce(which, 'owner')) in ('tenant', 'renter') then
    label := 'Tenant';
    raw := nullif(trim(flat.tenant_phone), '');
    if raw is null then
      select nullif(trim(r.phone), '') into raw
      from public.flat_renters r
      where r.flat_id = flat.id
        and r.end_date is null
        and nullif(trim(r.phone), '') is not null
      order by r.id desc
      limit 1;
    end if;
  else
    label := 'Owner';
    raw := nullif(trim(flat.phone), '');
  end if;

  if raw is null then
    return jsonb_build_object('ok', false, 'reason', 'No phone on file for that person.');
  end if;

  begin
    digits := public.normalize_phone(raw);
  exception when others then
    digits := regexp_replace(raw, '\D', '', 'g');
  end;

  if digits is null or length(digits) < 8 then
    return jsonb_build_object('ok', false, 'reason', 'No phone on file for that person.');
  end if;

  if length(digits) = 10 then
    dial := '+91' || digits;
  elsif left(digits, 2) = '91' and length(digits) = 12 then
    dial := '+' || digits;
  elsif left(raw, 1) = '+' then
    dial := '+' || regexp_replace(raw, '\D', '', 'g');
  else
    dial := digits;
  end if;

  -- Security dials without seeing the number in the app.
  show_number := actor <> 'security';

  return jsonb_build_object(
    'ok', true,
    'dial', dial,
    'showNumber', show_number,
    'display', case
      when not show_number then null
      when length(digits) < 4 then '****'
      else substr(digits, 1, 2) || '******' || right(digits, 2)
    end,
    'label', label,
    'home', flat.flat_number
  );
end;
$$;

revoke all on function public.resolve_call(text, text) from public, anon;
grant execute on function public.resolve_call(text, text) to authenticated;
