-- Admin creates tasks for a society role (staff / facility / security)
-- and can change title, place, body, or role later. Role pool is visible
-- to that role until claimed by a person.

alter table public.work_orders
  add column if not exists assignee_role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_orders_assignee_role_check'
  ) then
    alter table public.work_orders
      add constraint work_orders_assignee_role_check
      check (assignee_role is null or assignee_role in ('staff', 'facility', 'security'));
  end if;
end $$;

create index if not exists work_orders_role_idx
  on public.work_orders (assignee_role)
  where assignee_role is not null;

drop policy if exists work_orders_assigned on public.work_orders;
create policy work_orders_assigned
on public.work_orders for select to authenticated
using (
  assignee_user_id = auth.uid()
  or public.current_profile_role() in ('facility', 'admin')
  or (
    assignee_user_id is null
    and assignee_role is not null
    and assignee_role = public.current_profile_role()
  )
);

create or replace function public.role_task_label(role text)
returns text
language sql
immutable
as $$
  select case role
    when 'staff' then 'Staff'
    when 'facility' then 'Facility'
    when 'security' then 'Security'
    else coalesce(role, '')
  end;
$$;

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
    'assigneeRole', w.assignee_role,
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
  left join public.profiles ap on ap.user_id = w.assignee_user_id;

  return jsonb_build_object(
    'canManage', public.phone_access('maintenance') = 'manage',
    'people', people,
    'jobs', jobs
  );
end;
$$;

revoke all on function public.list_jobs_desk() from public, anon;
grant execute on function public.list_jobs_desk() to authenticated;

drop function if exists public.open_job(text, text, text);

create or replace function public.open_job(
  title text,
  place text default '',
  body text default '',
  target_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := nullif(lower(trim(target_role)), '');
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
  end if;
  if nullif(trim(title), '') is null then
    raise exception 'Name the task.';
  end if;
  insert into public.work_orders (title, place, body, status, assignee_role)
  values (
    trim(title),
    coalesce(place, ''),
    coalesce(body, ''),
    'open',
    role
  );
  return jsonb_build_object(
    'ok', true,
    'message',
      case
        when role is null then 'Task opened.'
        else 'Task opened for ' || public.role_task_label(role) || '.'
      end
  );
end;
$$;

revoke all on function public.open_job(text, text, text, text) from public, anon;
grant execute on function public.open_job(text, text, text, text) to authenticated;

create or replace function public.update_job(
  job_id bigint,
  title text default null,
  place text default null,
  body text default null,
  target_role text default null,
  clear_person boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := nullif(lower(trim(target_role)), '');
  row public.work_orders%rowtype;
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
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

  update public.work_orders
  set title = coalesce(nullif(trim(title), ''), work_orders.title),
      place = coalesce(place, work_orders.place),
      body = coalesce(body, work_orders.body),
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

revoke all on function public.update_job(bigint, text, text, text, text, boolean) from public, anon;
grant execute on function public.update_job(bigint, text, text, text, text, boolean) to authenticated;

drop function if exists public.assign_job(bigint, uuid, text);

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
begin
  perform public.require_role(array['admin','facility']);
  perform public.phone_require('maintenance', 'manage');
  if role is not null and role not in ('staff', 'facility', 'security') then
    raise exception 'Choose Staff, Facility, or Security.';
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
  end if;
  return jsonb_build_object('ok', true, 'message', 'Task updated.');
end;
$$;

revoke all on function public.assign_job(bigint, uuid, text, text) from public, anon;
grant execute on function public.assign_job(bigint, uuid, text, text) to authenticated;

create or replace function public.update_my_task(task_id bigint, next_status text, note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.work_orders%rowtype;
  actor text := public.current_profile_role();
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
end;
$$;

revoke all on function public.update_my_task(bigint, text, text) from public, anon;
grant execute on function public.update_my_task(bigint, text, text) to authenticated;
