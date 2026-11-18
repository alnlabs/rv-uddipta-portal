-- Phase 2b: Work list drives live job role defaults + duty holders in job desk.

-- Suggested live role for a Work list item (staff / facility / security only).
create or replace function public.suggested_job_role_for_task(p_task_id bigint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  picked text;
begin
  -- Prefer staff, then facility, then security among roles that hold this duty.
  select x.role_key into picked
  from (
    select r.key as role_key,
      case r.key
        when 'staff' then 1
        when 'facility' then 2
        when 'security' then 3
        else 9
      end as rank
    from public.society_role_tasks rt
    join public.society_roles r on r.id = rt.role_id and r.enabled
    where rt.task_id = p_task_id
      and r.key in ('staff', 'facility', 'security')
    order by rank
    limit 1
  ) x;
  return picked;
end;
$$;

revoke all on function public.suggested_job_role_for_task(bigint) from public, anon;
grant execute on function public.suggested_job_role_for_task(bigint) to authenticated;

-- People who hold a duty (role duty ∪ extra duty), limited to job desks.
create or replace function public.duty_holder_user_ids(p_task_id bigint)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct uid), '{}')
  from (
    select pr.user_id as uid
    from public.society_role_tasks rt
    join public.society_roles r on r.id = rt.role_id and r.enabled
    join public.person_roles pr on pr.role = r.key
    where rt.task_id = p_task_id
      and r.key in ('staff', 'facility', 'security')
    union
    select pt.user_id
    from public.society_person_tasks pt
    join public.profiles p on p.user_id = pt.user_id
    where pt.task_id = p_task_id
      and p.role in ('staff', 'facility', 'security')
  ) x;
$$;

revoke all on function public.duty_holder_user_ids(bigint) from public, anon;
grant execute on function public.duty_holder_user_ids(bigint) to authenticated;

-- Enrich active work list with suggested job role + holder ids.
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
        'duration', t.duration,
        'suggestedRole', public.suggested_job_role_for_task(t.id),
        'holderIds', to_jsonb(public.duty_holder_user_ids(t.id))
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

-- open_job: default assignee_role from Work list when not provided.
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
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');

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

-- list_jobs_desk: include linked Work + mark duty holders among people.
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
    'canManage', public.phone_access('maintenance') = 'manage',
    'people', people,
    'jobs', jobs,
    'work', public.list_active_society_work()
  );
end;
$$;

revoke all on function public.list_jobs_desk() from public, anon;
grant execute on function public.list_jobs_desk() to authenticated;
