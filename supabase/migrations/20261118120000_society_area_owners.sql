-- Who looks after an area for a period (generic). Admin always keep-informed separately.

create table if not exists public.society_area_owners (
  area_key text primary key
    check (area_key in ('repairs', 'gate', 'notices')),
  label text not null,
  owner_role text not null
    check (owner_role in ('admin', 'builder', 'facility', 'staff', 'security', 'committee')),
  starts_at timestamptz,
  ends_at timestamptz,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.society_area_owners enable row level security;
revoke all on public.society_area_owners from public, anon, authenticated;

insert into public.society_area_owners (area_key, label, owner_role, starts_at, ends_at, summary)
values
  (
    'repairs',
    'Repairs',
    'builder',
    now(),
    null,
    'Who looks after repair jobs for now. Change later to Facility when handed over.'
  ),
  (
    'gate',
    'Gate',
    'security',
    null,
    null,
    'Gate stays with Security unless you change it.'
  ),
  (
    'notices',
    'Notices',
    'committee',
    null,
    null,
    'Society notices and votes.'
  )
on conflict (area_key) do nothing;

-- Current owner role for an area (null ends_at = open-ended; outside window → facility for repairs, else owner_role if no dates).
create or replace function public.current_area_owner_role(p_area text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.society_area_owners%rowtype;
begin
  select * into row from public.society_area_owners where area_key = p_area;
  if not found then
    if p_area = 'repairs' then return 'facility'; end if;
    if p_area = 'gate' then return 'security'; end if;
    if p_area = 'notices' then return 'committee'; end if;
    return null;
  end if;
  if row.starts_at is not null and row.starts_at > now() then
    if p_area = 'repairs' then return 'facility'; end if;
    return row.owner_role;
  end if;
  if row.ends_at is not null and row.ends_at <= now() then
    if p_area = 'repairs' then return 'facility'; end if;
    return row.owner_role;
  end if;
  return row.owner_role;
end;
$$;

revoke all on function public.current_area_owner_role(text) from public, anon;
grant execute on function public.current_area_owner_role(text) to authenticated;

create or replace function public.can_manage_area(p_area text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  owner text;
begin
  if auth.uid() is null then return false; end if;
  if public.is_platform_admin() then return true; end if;
  actor := public.current_profile_role_safe();
  if actor = 'admin' then return true; end if;
  -- Facility always helps on repairs alongside the period owner.
  if p_area = 'repairs' and actor = 'facility' then return true; end if;
  owner := public.current_area_owner_role(p_area);
  return owner is not null and actor = owner;
end;
$$;

revoke all on function public.can_manage_area(text) from public, anon;
grant execute on function public.can_manage_area(text) to authenticated;

create or replace function public.require_jobs_manager()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text;
  feature_on boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select enabled into feature_on from public.community_features where key = 'maintenance';
  if feature_on is distinct from true then
    raise exception 'Jobs are turned off for the community.';
  end if;
  if public.is_platform_admin() then
    return 'admin';
  end if;
  if not public.can_manage_area('repairs') then
    raise exception 'This is not available on your account.';
  end if;
  actor := public.current_profile_role_safe();
  return actor;
end;
$$;

revoke all on function public.require_jobs_manager() from public, anon;
grant execute on function public.require_jobs_manager() to authenticated;

create or replace function public.list_society_areas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_society_office();
  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'areaKey', a.area_key,
        'label', a.label,
        'ownerRole', a.owner_role,
        'currentOwnerRole', public.current_area_owner_role(a.area_key),
        'startsAt', a.starts_at,
        'endsAt', a.ends_at,
        'summary', a.summary
      ) order by a.area_key)
      from public.society_area_owners a
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_society_areas() from public, anon;
grant execute on function public.list_society_areas() to authenticated;

create or replace function public.save_society_area(
  p_area_key text,
  p_owner_role text,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_summary text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.society_area_owners%rowtype;
begin
  perform public.require_society_office();
  if p_area_key not in ('repairs', 'gate', 'notices') then
    raise exception 'Unknown area.';
  end if;
  if p_owner_role not in ('admin', 'builder', 'facility', 'staff', 'security', 'committee') then
    raise exception 'Pick a valid role.';
  end if;
  -- Gate stays security-only in product rules for now.
  if p_area_key = 'gate' and p_owner_role is distinct from 'security' then
    raise exception 'Gate stays with Security.';
  end if;

  update public.society_area_owners set
    owner_role = p_owner_role,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    summary = coalesce(p_summary, summary),
    updated_at = now()
  where area_key = p_area_key
  returning * into row;

  if not found then
    raise exception 'That area was not found.';
  end if;
  return to_jsonb(row) || jsonb_build_object(
    'currentOwnerRole', public.current_area_owner_role(p_area_key)
  );
end;
$$;

revoke all on function public.save_society_area(text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.save_society_area(text, text, timestamptz, timestamptz, text) to authenticated;

-- Jobs RPCs: use require_jobs_manager instead of admin|facility only.
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
  perform public.require_jobs_manager();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id::text,
    'name', coalesce(p.display_name, p.role),
    'role', p.role,
    'onDuty', coalesce(p.on_duty, false)
  ) order by p.display_name), '[]'::jsonb)
  into people
  from public.profiles p
  where p.role in ('staff', 'facility', 'security');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id,
    'title', w.title,
    'place', coalesce(w.place, ''),
    'body', coalesce(w.body, ''),
    'status', w.status,
    'state', w.status,
    'assigneeId', w.assignee_user_id::text,
    'assigneeRole', w.assignee_role,
    'frequency', coalesce(w.frequency, 'once'),
    'frequencyLabel', public.task_frequency_label(coalesce(w.frequency, 'once')),
    'societyTaskId', w.society_task_id,
    'workKey', t.key,
    'workLabel', t.label,
    'holderIds', case
      when w.society_task_id is null then '[]'::jsonb
      else to_jsonb(public.duty_holder_user_ids(w.society_task_id))
    end,
    'who', case
      when ap.display_name is not null and trim(ap.display_name) <> '' then ap.display_name
      when w.assignee_role is not null then 'For ' || public.role_task_label(w.assignee_role)
      else 'Unassigned'
    end
  ) order by w.id desc), '[]'::jsonb)
  into jobs
  from (
    select *
    from public.work_orders
    order by id desc
    limit 40
  ) w
  left join public.profiles ap on ap.user_id = w.assignee_user_id
  left join public.society_tasks t on t.id = w.society_task_id;

  return jsonb_build_object(
    'canManage', public.can_manage_area('repairs'),
    'people', people,
    'jobs', jobs,
    'work', public.list_active_society_work(),
    'repairsOwner', public.current_area_owner_role('repairs')
  );
end;
$$;

revoke all on function public.list_jobs_desk() from public, anon;
grant execute on function public.list_jobs_desk() to authenticated;

drop function if exists public.open_job(text, text, text, text, text, text);

create or replace function public.open_job(
  title text,
  place text default '',
  body text default '',
  target_role text default null,
  frequency text default 'once',
  task_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := nullif(lower(trim(target_role)), '');
  how_often text := public.normalize_task_frequency(frequency);
  tid bigint;
  work_label text;
  job_title text;
  new_id bigint;
  suggested text;
begin
  perform public.require_jobs_manager();

  if nullif(trim(coalesce(task_key, '')), '') is not null then
    select id, label into tid, work_label
    from public.society_tasks
    where key = trim(task_key) and enabled
    limit 1;
    if tid is null then
      raise exception 'That work was not found.';
    end if;
    if role is null then
      suggested := public.suggested_job_role_for_task(tid);
      role := suggested;
    end if;
  end if;

  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
  end if;

  job_title := coalesce(nullif(trim(title), ''), work_label);
  if job_title is null or job_title = '' then
    raise exception 'Name the task.';
  end if;

  insert into public.work_orders (
    title, place, body, status, assignee_role, frequency, society_task_id
  ) values (
    job_title, coalesce(place, ''), coalesce(body, ''), 'open', role, how_often, tid
  )
  returning id into new_id;

  perform public.notify_job_watchers(
    'Job opened',
    job_title
      || case when nullif(trim(coalesce(place, '')), '') is null then '' else ' · ' || trim(place) end
      || case when role is null then '' else ' · for ' || public.role_task_label(role) end,
    '/account/jobs',
    '{}'
  );

  return jsonb_build_object(
    'ok', true,
    'id', new_id,
    'message',
      case
        when role is null then 'Task opened · ' || public.task_frequency_label(how_often) || '.'
        else 'Task opened for ' || public.role_task_label(role)
          || ' · ' || public.task_frequency_label(how_often) || '.'
      end
  );
end;
$$;

revoke all on function public.open_job(text, text, text, text, text, text) from public, anon;
grant execute on function public.open_job(text, text, text, text, text, text) to authenticated;

create or replace function public.assign_job(
  job_id bigint,
  assignee uuid default null,
  next_status text default null,
  target_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := nullif(lower(trim(target_role)), '');
  row public.work_orders%rowtype;
  also uuid[] := '{}';
  status_label text;
begin
  perform public.require_jobs_manager();
  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
  end if;
  select * into row from public.work_orders where id = job_id;
  if not found then
    raise exception 'That task is gone.';
  end if;

  update public.work_orders
  set assignee_user_id = case
        when assignee is not null then assignee
        when role is not null then null
        else assignee_user_id
      end,
      assignee_role = case
        when role is not null then role
        when assignee is not null then assignee_role
        else assignee_role
      end,
      status = coalesce(next_status, status)
  where id = job_id;

  if next_status = 'done' then
    update public.member_notes n
    set status = 'done'
    from public.work_orders w
    where w.id = job_id and w.source_note_id = n.id;
    perform public.spawn_next_role_task(row);
  end if;

  if assignee is not null then
    also := array[assignee];
  end if;
  status_label := coalesce(next_status, row.status);
  perform public.notify_job_watchers(
    'Job update',
    row.title || ' · ' || replace(status_label, '_', ' '),
    '/account/jobs',
    also
  );

  return jsonb_build_object('ok', true, 'message', 'Task updated.');
end;
$$;

revoke all on function public.assign_job(bigint, uuid, text, text) from public, anon;
grant execute on function public.assign_job(bigint, uuid, text, text) to authenticated;

create or replace function public.update_job(
  job_id bigint,
  title text default null,
  place text default null,
  body text default null,
  target_role text default null,
  clear_person boolean default false,
  frequency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := nullif(lower(trim(target_role)), '');
  row public.work_orders%rowtype;
  how_often text;
begin
  perform public.require_jobs_manager();
  select * into row from public.work_orders where id = job_id;
  if not found then
    raise exception 'That task is gone.';
  end if;
  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
  end if;
  if title is not null and nullif(trim(title), '') is null then
    raise exception 'Name the task.';
  end if;
  if frequency is not null then
    how_often := public.normalize_task_frequency(frequency);
  end if;

  update public.work_orders
  set title = coalesce(nullif(trim(title), ''), work_orders.title),
      place = coalesce(place, work_orders.place),
      body = coalesce(body, work_orders.body),
      frequency = coalesce(how_often, work_orders.frequency),
      assignee_role = case
        when target_role is null then work_orders.assignee_role
        when role is null then null
        else role
      end,
      assignee_user_id = case
        when clear_person then null
        when role is not null and role is distinct from work_orders.assignee_role then null
        else work_orders.assignee_user_id
      end
  where id = job_id;

  return jsonb_build_object('ok', true, 'message', 'Task updated.');
end;
$$;

revoke all on function public.update_job(bigint, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.update_job(bigint, text, text, text, text, boolean, text) to authenticated;

-- Authorable labels for Areas UI
insert into public.society_labels (key, value) values
  ('areas', 'Areas'),
  ('who_looks_after', 'Who looks after this'),
  ('help_areas', 'Set who looks after each area for a period. Admins stay informed. Gate stays with Security.'),
  ('from_date', 'From'),
  ('until_date', 'Until'),
  ('current_owner', 'Looking after it now')
on conflict (key) do nothing;
