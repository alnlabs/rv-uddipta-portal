-- Match portal fallbackDeskAccess (lib/deskAccess.ts) so phone RPCs and
-- list_my_features grant the same desks as the website when role_permissions
-- has no row. Also queue Expo pushes when notifications are inserted from RPCs.

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

  if public.is_platform_admin() then
    return 'manage';
  end if;

  actor_role := public.current_profile_role_safe();
  if actor_role is null or actor_role = 'visitor' then
    return 'none';
  end if;

  select enabled into turned_on from public.community_features where key = feature;
  if turned_on is false then
    return 'none';
  end if;

  select access into saved
  from public.role_permissions
  where role = actor_role and feature_key = feature;
  if saved in ('none', 'view', 'manage') then
    return saved;
  end if;

  -- Same defaults as portal fallbackDeskAccess.
  if actor_role = 'admin' then
    return 'manage';
  end if;

  if feature = 'gate' then
    return case when actor_role = 'security' then 'manage' else 'none' end;
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

create or replace function public.phone_require(feature text, level text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_role text;
  access text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  actor_role := public.current_profile_role_safe();
  if actor_role is null or actor_role = 'visitor' then
    raise exception 'You can do this after your flat is approved.';
  end if;
  access := public.phone_access(feature);
  if access = 'none' then
    raise exception 'This is not available on your account.';
  end if;
  if level = 'manage' and access <> 'manage' then
    raise exception 'You can look at this. You cannot change it.';
  end if;
end;
$$;

-- Expo push outbox: RPCs insert notifications; a portal flush sends Expo. ------

create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists push_outbox_pending_idx
  on public.push_outbox (id)
  where sent_at is null;

alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from public, anon, authenticated;

create or replace function public.queue_expo_push(
  user_ids uuid[],
  title text,
  body text,
  data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_ids is null or array_length(user_ids, 1) is null then
    return;
  end if;
  insert into public.push_outbox (user_id, title, body, data)
  select distinct u, title, body, coalesce(data, '{}'::jsonb)
  from unnest(user_ids) as u
  where u is not null;
end;
$$;

revoke all on function public.queue_expo_push(uuid[], text, text, jsonb) from public, anon, authenticated;
grant execute on function public.queue_expo_push(uuid[], text, text, jsonb) to authenticated;

create or replace function public.notifications_queue_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_expo_push(
    array[new.user_id],
    coalesce(new.title, 'RV Uddiipta'),
    coalesce(new.body, ''),
    jsonb_build_object(
      'href', coalesce(new.href, ''),
      'kind', coalesce(new.kind, ''),
      'notificationId', new.id
    )
  );
  return new;
end;
$$;

drop trigger if exists notifications_queue_push on public.notifications;
create trigger notifications_queue_push
after insert on public.notifications
for each row
execute function public.notifications_queue_push();

-- Notify the other home when a connect request is sent or answered. ----------

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
  my_home text;
  to_flat bigint;
  to_home text;
  new_id bigint;
  who text;
begin
  perform public.require_role(array['owner','co_owner','tenant','admin']);
  perform public.phone_require('neighbours', 'manage');
  select flat_id into my_flat from public.profiles where user_id = auth.uid();
  if my_flat is null then raise exception 'Link a home first.'; end if;
  select flat_number into my_home from public.flats where id = my_flat;
  select coalesce(nullif(trim(display_name), ''), 'Neighbour') into who
  from public.profiles where user_id = auth.uid();

  if action in ('accept', 'refuse') then
    update public.connection_requests
    set status = case when action = 'accept' then 'accepted' else 'refused' end,
        answered_at = now(),
        answered_by = auth.uid()
    where id = request_id
      and to_flat_id = my_flat
      and status = 'pending';
    if not found then raise exception 'Request not found.'; end if;

    insert into public.notifications (user_id, kind, title, body, href)
    select
      c.from_user_id,
      'connect',
      case when action = 'accept' then 'Connection accepted' else 'Connection declined' end,
      coalesce(my_home, 'A neighbour') || case when action = 'accept' then ' accepted your request.' else ' declined your request.' end,
      '/neighbours'
    from public.connection_requests c
    where c.id = request_id;

    return jsonb_build_object('message', 'Updated.', 'status', action);
  end if;

  select id, flat_number into to_flat, to_home from public.flats where flat_number = upper(trim(target_home));
  if to_flat is null then
    select id, flat_number into to_flat, to_home from public.flats where flat_number ilike trim(target_home);
  end if;
  if to_flat is null then raise exception 'Home not found.'; end if;
  if to_flat = my_flat then raise exception 'That is your home.'; end if;

  insert into public.connection_requests (from_user_id, from_flat_id, to_flat_id, note, status)
  values (auth.uid(), my_flat, to_flat, coalesce(note, ''), 'pending')
  returning id into new_id;

  insert into public.notifications (user_id, kind, title, body, href)
  select
    p.user_id,
    'connect',
    'Neighbour wants to connect',
    who || ' from ' || coalesce(my_home, 'another home') || ' asked to connect with ' || coalesce(to_home, 'your home') || '.',
    '/neighbours'
  from public.profiles p
  where p.flat_id = to_flat;

  return jsonb_build_object('message', 'Request sent.', 'status', 'pending', 'requestId', new_id);
end;
$$;

revoke all on function public.request_connection(text, text, text, bigint) from public, anon;
grant execute on function public.request_connection(text, text, text, bigint) to authenticated;
