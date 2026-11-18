-- Link live jobs to Work list items + keep informed (admins) on job changes.

alter table public.work_orders
  add column if not exists society_task_id bigint
    references public.society_tasks (id) on delete set null;

create index if not exists work_orders_society_task_idx
  on public.work_orders (society_task_id)
  where society_task_id is not null;

-- ---------------------------------------------------------------------------
-- Notify watchers: society admins (keep informed) + optional assignee
-- ---------------------------------------------------------------------------

create or replace function public.notify_job_watchers(
  p_title text,
  p_body text,
  p_href text default '/account/jobs',
  p_also uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[];
  uid uuid;
begin
  select coalesce(array_agg(distinct u), '{}')
  into ids
  from (
    select user_id as u from public.profiles where role = 'admin'
    union
    select user_id from public.person_roles where role = 'admin'
    union
    select unnest(coalesce(p_also, '{}'))
  ) x
  where u is not null;

  foreach uid in array ids
  loop
    insert into public.notifications (user_id, kind, title, body, href)
    values (uid, 'job_update', p_title, p_body, p_href);
  end loop;
end;
$$;

revoke all on function public.notify_job_watchers(text, text, text, uuid[]) from public, anon;
grant execute on function public.notify_job_watchers(text, text, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- open_job: optional Work list key
-- ---------------------------------------------------------------------------

drop function if exists public.open_job(text, text, text, text, text);

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
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
  end if;

  if nullif(trim(coalesce(task_key, '')), '') is not null then
    select id, label into tid, work_label
    from public.society_tasks
    where key = trim(task_key) and enabled
    limit 1;
    if tid is null then
      raise exception 'That work was not found.';
    end if;
  end if;

  job_title := coalesce(nullif(trim(title), ''), work_label);
  if job_title is null or job_title = '' then
    raise exception 'Name the task.';
  end if;

  insert into public.work_orders (title, place, body, status, assignee_role, frequency, society_task_id)
  values (
    job_title,
    coalesce(place, ''),
    coalesce(body, ''),
    'open',
    role,
    how_often,
    tid
  )
  returning id into new_id;

  perform public.notify_job_watchers(
    public.society_label('reminder_title', 'Duty reminder'),
    'Job opened: ' || job_title
      || case when nullif(trim(coalesce(place, '')), '') is null then '' else ' · ' || trim(place) end,
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

-- ---------------------------------------------------------------------------
-- assign_job: keep informed
-- ---------------------------------------------------------------------------

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
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
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

-- ---------------------------------------------------------------------------
-- update_my_task: keep informed
-- ---------------------------------------------------------------------------

create or replace function public.update_my_task(task_id bigint, next_status text, note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.work_orders%rowtype;
  actor text := public.current_profile_role();
  also uuid[] := '{}';
begin
  if next_status not in ('in_progress', 'done') then
    raise exception 'Choose start or done.';
  end if;
  select * into row from public.work_orders where id = task_id;
  if not found then
    raise exception 'That task is gone.';
  end if;
  if actor not in ('staff', 'facility', 'admin', 'security') then
    raise exception 'This is for service staff.';
  end if;
  if actor = 'admin' or actor = 'facility' then
    null;
  elsif row.assignee_user_id = auth.uid() then
    null;
  elsif row.assignee_user_id is null and row.assignee_role = actor then
    null;
  else
    raise exception 'This task is not yours.';
  end if;

  update public.work_orders
  set status = next_status,
      assignee_user_id = case
        when assignee_user_id is null and actor in ('staff', 'facility', 'security')
          then auth.uid()
        else assignee_user_id
      end,
      body = case
        when length(trim(note)) > 0 then trim(both from body || E'\n' || trim(note))
        else body
      end
  where id = task_id;

  if next_status = 'done' and row.source_note_id is not null then
    update public.member_notes set status = 'done' where id = row.source_note_id;
  end if;
  if next_status = 'done' then
    perform public.spawn_next_role_task(row);
  end if;

  if auth.uid() is not null then
    also := array[auth.uid()];
  end if;
  perform public.notify_job_watchers(
    'Job update',
    row.title || ' · ' || replace(next_status, '_', ' '),
    '/account/jobs',
    also
  );
end;
$$;

revoke all on function public.update_my_task(bigint, text, text) from public, anon;
grant execute on function public.update_my_task(bigint, text, text) to authenticated;

-- Active work for job pickers
create or replace function public.list_active_society_work()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'key', t.key,
        'label', t.label,
        'summary', t.summary,
        'duration', t.duration
      ) order by t.label)
      from public.society_tasks t
      where t.enabled
        and (
          t.duration = 'regular'
          or t.ends_at is null
          or t.ends_at > now()
        )
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_active_society_work() from public, anon;
grant execute on function public.list_active_society_work() to authenticated;
