-- Society Work list, Roles (editable duties), extra duty on people,
-- Reminders, and authorable display labels. Setup + reminders only;
-- live work_orders / gate stay as today.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.society_tasks (
  id bigint generated always as identity primary key,
  key text not null unique,
  label text not null,
  summary text not null default '',
  system boolean not null default false,
  enabled boolean not null default true,
  duration text not null default 'regular'
    check (duration in ('regular', 'temporary')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.society_roles (
  id bigint generated always as identity primary key,
  key text not null unique,
  label text not null,
  summary text not null default '',
  system boolean not null default false,
  enabled boolean not null default true,
  maps_to text
    check (maps_to is null or maps_to in ('security', 'staff', 'facility', 'committee', 'builder', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.society_role_tasks (
  role_id bigint not null references public.society_roles (id) on delete cascade,
  task_id bigint not null references public.society_tasks (id) on delete cascade,
  primary key (role_id, task_id)
);

create table if not exists public.society_person_tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id bigint not null references public.society_tasks (id) on delete cascade,
  primary key (user_id, task_id),
  created_at timestamptz not null default now()
);

create table if not exists public.society_reminders (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.society_tasks (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  remind_at timestamptz,
  offset_minutes integer not null default 0,
  anchor text not null default 'absolute'
    check (anchor in ('start', 'end', 'absolute', 'repeat')),
  repeat text not null default 'none'
    check (repeat in ('none', 'daily', 'weekly')),
  keep_informed boolean not null default true,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists society_reminders_due_idx
  on public.society_reminders (enabled, anchor, remind_at)
  where enabled;

create table if not exists public.society_labels (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.society_tasks enable row level security;
alter table public.society_roles enable row level security;
alter table public.society_role_tasks enable row level security;
alter table public.society_person_tasks enable row level security;
alter table public.society_reminders enable row level security;
alter table public.society_labels enable row level security;

revoke all on public.society_tasks from public, anon, authenticated;
revoke all on public.society_roles from public, anon, authenticated;
revoke all on public.society_role_tasks from public, anon, authenticated;
revoke all on public.society_person_tasks from public, anon, authenticated;
revoke all on public.society_reminders from public, anon, authenticated;
revoke all on public.society_labels from public, anon, authenticated;

-- Authenticated may read labels (display words). Mutations go through RPCs.
grant select on public.society_labels to authenticated;

create policy society_labels_read on public.society_labels
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seeds: roles
-- ---------------------------------------------------------------------------

insert into public.society_roles (key, label, summary, system, enabled, maps_to)
values
  ('security', 'Security', 'Gate and visitor entry.', true, true, 'security'),
  ('facility', 'Facility manager', 'Looks after repairs and common work.', true, true, 'facility'),
  ('staff', 'Service staff', 'Does allotted repair and service work.', true, true, 'staff'),
  ('committee', 'Committee', 'Society decisions and notices.', true, true, 'committee'),
  ('builder', 'Builder', 'Building details and early-year repair support.', true, true, 'builder')
on conflict (key) do update set
  label = excluded.label,
  summary = excluded.summary,
  system = true,
  maps_to = excluded.maps_to;

-- ---------------------------------------------------------------------------
-- Seeds: work
-- ---------------------------------------------------------------------------

insert into public.society_tasks (key, label, summary, system, enabled, duration)
values
  ('gate_check', 'Gate check', 'Check people and vehicles at the gate.', true, true, 'regular'),
  ('guest_entry_exit', 'Guest entry / exit', 'Record visitor entry and exit.', true, true, 'regular'),
  ('mark_staff_present', 'Mark staff present', 'Mark attendance for staff on duty.', true, true, 'regular'),
  ('open_repair', 'Open repair', 'Open a repair or maintenance job.', true, true, 'regular'),
  ('do_assigned_repair', 'Do assigned repair', 'Complete allotted repair work.', true, true, 'regular'),
  ('shared_space_booking', 'Shared-space booking', 'Manage common amenity bookings.', true, true, 'regular'),
  ('society_notice', 'Society notice / vote', 'Society notice and committee vote.', true, true, 'regular')
on conflict (key) do update set
  label = excluded.label,
  summary = excluded.summary,
  system = true;

-- ---------------------------------------------------------------------------
-- Seeds: role ↔ work
-- ---------------------------------------------------------------------------

insert into public.society_role_tasks (role_id, task_id)
select r.id, t.id
from public.society_roles r
join public.society_tasks t on true
where (r.key, t.key) in (
  ('security', 'gate_check'),
  ('security', 'guest_entry_exit'),
  ('security', 'mark_staff_present'),
  ('facility', 'open_repair'),
  ('facility', 'do_assigned_repair'),
  ('facility', 'shared_space_booking'),
  ('staff', 'do_assigned_repair'),
  ('committee', 'society_notice'),
  ('builder', 'open_repair'),
  ('builder', 'do_assigned_repair')
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seeds: labels (Indian English defaults — super admin can change)
-- ---------------------------------------------------------------------------

insert into public.society_labels (key, value) values
  ('work_list', 'Work list'),
  ('work', 'Work'),
  ('duty', 'Duty'),
  ('regular_duty', 'Regular duty'),
  ('temporary_duty', 'Temporary duty'),
  ('role', 'Role'),
  ('roles', 'Roles'),
  ('duties_of_role', 'Duties of this role'),
  ('change_duties', 'Change duties'),
  ('save_duties', 'Save duties'),
  ('add_staff', 'Add staff'),
  ('create_staff', 'Create staff'),
  ('create_staff_help', 'Phone + PIN for Security, Facility, Staff, and other society roles. Email is optional.'),
  ('give_roles', 'Give role(s)'),
  ('extra_duty', 'Extra duty'),
  ('extra_duty_help', 'Additional work for this person only, on top of duties from their roles.'),
  ('save_extra_duty', 'Save extra duty'),
  ('people', 'People'),
  ('people_count', '{{count}} people'),
  ('reminder', 'Reminder'),
  ('reminders', 'Reminders'),
  ('set_reminder', 'Set reminder'),
  ('working_as', 'Working as'),
  ('switch_role', 'Switch role'),
  ('keep_informed', 'Keep informed'),
  ('send_due_reminders', 'Send due reminders'),
  ('labels', 'Labels'),
  ('save_labels', 'Save labels'),
  ('default_label', 'Default'),
  ('name', 'Name'),
  ('summary', 'Summary'),
  ('type', 'Type'),
  ('add', 'Add'),
  ('save', 'Save'),
  ('saved', 'Saved.'),
  ('saving', 'Saving…'),
  ('sending', 'Sending…'),
  ('close', 'Close'),
  ('search', 'Search'),
  ('on', 'On'),
  ('off', 'Off'),
  ('turn_on', 'Turn on'),
  ('turn_off', 'Turn off'),
  ('standard', 'Standard'),
  ('custom', 'Custom'),
  ('inactive', 'inactive'),
  ('when', 'When'),
  ('date_time', 'Date / time'),
  ('minutes_before', 'Minutes before start/end'),
  ('repeat', 'Repeat'),
  ('none', 'None'),
  ('daily', 'Daily'),
  ('weekly', 'Weekly'),
  ('at_datetime', 'At date/time'),
  ('before_start', 'Before start'),
  ('before_end', 'Before end'),
  ('app_shell', 'App shell (maps to)'),
  ('starts_temporary', 'Starts (temporary)'),
  ('ends_temporary', 'Ends (temporary)'),
  ('select', 'Select…'),
  ('no_reminders_yet', 'No reminders yet.'),
  ('no_work_yet', 'No work yet.'),
  ('add_reminder_daily', 'Add reminder (daily)'),
  ('reminder_saved', 'Reminder saved.'),
  ('last_sent', 'Last sent'),
  ('who_does_what', 'Who does what'),
  ('help_work', 'Make the work list — regular or temporary. Work can stand alone or be linked to a role.'),
  ('help_roles', 'Make roles and set duties of this role. You can change duties anytime.'),
  ('help_people', 'Add staff, give one or more roles, and optionally extra duty.'),
  ('help_reminders', 'Set reminders on work so people get a nudge on time. Keep informed sends a copy to society admins.'),
  ('help_labels', 'Change display words and help sentences used across Work, Roles, People, and Reminders.'),
  ('help_who_does_what', 'Work list → Roles (duties) → Add staff and give roles. Extra duty is only for that person. People who live in a home are added under Flats.'),
  ('reminder_title', 'Duty reminder'),
  ('reminder_body', 'Reminder: {{work}} — please check and complete this duty.'),
  ('add_work', 'Add work'),
  ('add_role', 'Add role'),
  ('shell', 'shell')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.society_label(p_key text, fallback text default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.society_labels where key = p_key),
    fallback,
    p_key
  );
$$;

revoke all on function public.society_label(text, text) from public, anon;
grant execute on function public.society_label(text, text) to authenticated;

create or replace function public.require_society_office()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if not (public.is_platform_admin() or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;
end;
$$;

revoke all on function public.require_society_office() from public, anon;
grant execute on function public.require_society_office() to authenticated;

create or replace function public.require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if not public.is_platform_admin() then
    raise exception 'Only super admin can do this.';
  end if;
end;
$$;

revoke all on function public.require_platform_admin() from public, anon;
grant execute on function public.require_platform_admin() to authenticated;

create or replace function public.society_custom_key(prefix text, label text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(label, ''), '[^a-zA-Z0-9]+', '_', 'g'));
  base := trim(both '_' from base);
  if base = '' then base := 'item'; end if;
  candidate := prefix || '_' || left(base, 40);
  while exists (
    select 1 from public.society_tasks where key = candidate
    union all
    select 1 from public.society_roles where key = candidate
  ) loop
    n := n + 1;
    candidate := prefix || '_' || left(base, 36) || '_' || n::text;
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Labels RPCs
-- ---------------------------------------------------------------------------

create or replace function public.list_society_labels()
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
    (select jsonb_object_agg(key, value) from public.society_labels),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_society_labels() from public, anon;
grant execute on function public.list_society_labels() to authenticated;

create or replace function public.save_society_labels(entries jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  perform public.require_platform_admin();
  if entries is null or jsonb_typeof(entries) <> 'object' then
    raise exception 'Send label keys and values.';
  end if;
  for item in
    select key, value
    from jsonb_each_text(entries)
  loop
    if nullif(trim(item.key), '') is null then
      continue;
    end if;
    insert into public.society_labels (key, value, updated_at)
    values (trim(item.key), coalesce(item.value, ''), now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = now();
  end loop;
  return public.list_society_labels();
end;
$$;

revoke all on function public.save_society_labels(jsonb) from public, anon;
grant execute on function public.save_society_labels(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Catalog list
-- ---------------------------------------------------------------------------

create or replace function public.list_society_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  roles jsonb;
  work jsonb;
  reminders jsonb;
  people_extra jsonb;
begin
  perform public.require_society_office();

  select coalesce(jsonb_agg(to_jsonb(x) order by x.system desc, x.label), '[]'::jsonb)
  into roles
  from (
    select
      r.id,
      r.key,
      r.label,
      r.summary,
      r.system,
      r.enabled,
      r.maps_to,
      coalesce((
        select jsonb_agg(t.key order by t.label)
        from public.society_role_tasks rt
        join public.society_tasks t on t.id = rt.task_id
        where rt.role_id = r.id
      ), '[]'::jsonb) as task_keys,
      (
        select count(*)::int
        from public.person_roles pr
        where pr.role = r.key
      ) as people_count
    from public.society_roles r
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.system desc, x.label), '[]'::jsonb)
  into work
  from (
    select
      t.id,
      t.key,
      t.label,
      t.summary,
      t.system,
      t.enabled,
      t.duration,
      t.starts_at,
      t.ends_at,
      (
        t.enabled
        and (
          t.duration = 'regular'
          or t.ends_at is null
          or t.ends_at > now()
        )
      ) as active,
      coalesce((
        select jsonb_agg(r.key order by r.label)
        from public.society_role_tasks rt
        join public.society_roles r on r.id = rt.role_id
        where rt.task_id = t.id
      ), '[]'::jsonb) as role_keys
    from public.society_tasks t
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb)
  into reminders
  from (
    select
      rem.id,
      rem.task_id,
      t.key as task_key,
      t.label as task_label,
      rem.user_id,
      rem.remind_at,
      rem.offset_minutes,
      rem.anchor,
      rem.repeat,
      rem.keep_informed,
      rem.enabled,
      rem.last_sent_at
    from public.society_reminders rem
    join public.society_tasks t on t.id = rem.task_id
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.user_id, x.task_key), '[]'::jsonb)
  into people_extra
  from (
    select
      pt.user_id,
      t.key as task_key,
      t.label as task_label,
      t.id as task_id
    from public.society_person_tasks pt
    join public.society_tasks t on t.id = pt.task_id
  ) x;

  return jsonb_build_object(
    'roles', coalesce(roles, '[]'::jsonb),
    'work', coalesce(work, '[]'::jsonb),
    'reminders', coalesce(reminders, '[]'::jsonb),
    'people_extra', coalesce(people_extra, '[]'::jsonb),
    'labels', public.list_society_labels()
  );
end;
$$;

revoke all on function public.list_society_catalog() from public, anon;
grant execute on function public.list_society_catalog() to authenticated;

-- ---------------------------------------------------------------------------
-- Save work
-- ---------------------------------------------------------------------------

create or replace function public.save_society_task(
  p_id bigint default null,
  p_label text default null,
  p_summary text default null,
  p_enabled boolean default null,
  p_duration text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.society_tasks%rowtype;
  next_key text;
  dur text;
begin
  perform public.require_society_office();

  if p_id is not null then
    select * into row from public.society_tasks where id = p_id;
    if not found then
      raise exception 'That work was not found.';
    end if;
    dur := coalesce(nullif(p_duration, ''), row.duration);
    if dur not in ('regular', 'temporary') then
      raise exception 'Duration must be regular or temporary.';
    end if;
    update public.society_tasks set
      label = coalesce(nullif(trim(p_label), ''), label),
      summary = coalesce(p_summary, summary),
      enabled = coalesce(p_enabled, enabled),
      duration = dur,
      starts_at = case when p_duration = 'regular' then null else coalesce(p_starts_at, starts_at) end,
      ends_at = case when p_duration = 'regular' then null else coalesce(p_ends_at, ends_at) end
    where id = p_id
    returning * into row;
  else
    if nullif(trim(p_label), '') is null then
      raise exception 'Give a name for this work.';
    end if;
    dur := coalesce(nullif(p_duration, ''), 'regular');
    if dur not in ('regular', 'temporary') then
      raise exception 'Duration must be regular or temporary.';
    end if;
    next_key := public.society_custom_key('custom', p_label);
    insert into public.society_tasks (key, label, summary, system, enabled, duration, starts_at, ends_at)
    values (
      next_key,
      trim(p_label),
      coalesce(p_summary, ''),
      false,
      coalesce(p_enabled, true),
      dur,
      case when dur = 'temporary' then p_starts_at else null end,
      case when dur = 'temporary' then p_ends_at else null end
    )
    returning * into row;
  end if;

  return to_jsonb(row);
end;
$$;

revoke all on function public.save_society_task(bigint, text, text, boolean, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.save_society_task(bigint, text, text, boolean, text, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Save role
-- ---------------------------------------------------------------------------

create or replace function public.save_society_role(
  p_id bigint default null,
  p_label text default null,
  p_summary text default null,
  p_enabled boolean default null,
  p_maps_to text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.society_roles%rowtype;
  next_key text;
  map text;
begin
  perform public.require_society_office();
  map := nullif(trim(coalesce(p_maps_to, '')), '');
  if map is not null and map not in ('security', 'staff', 'facility', 'committee', 'builder', 'admin') then
    raise exception 'Pick a valid maps_to shell.';
  end if;

  if p_id is not null then
    select * into row from public.society_roles where id = p_id;
    if not found then
      raise exception 'That role was not found.';
    end if;
    if row.system and p_enabled is false then
      -- system roles can be disabled for this society if needed
      null;
    end if;
    update public.society_roles set
      label = coalesce(nullif(trim(p_label), ''), label),
      summary = coalesce(p_summary, summary),
      enabled = coalesce(p_enabled, enabled),
      maps_to = case when row.system then maps_to else coalesce(map, maps_to) end
    where id = p_id
    returning * into row;
  else
    if nullif(trim(p_label), '') is null then
      raise exception 'Give a name for this role.';
    end if;
    next_key := public.society_custom_key('custom', p_label);
    insert into public.society_roles (key, label, summary, system, enabled, maps_to)
    values (
      next_key,
      trim(p_label),
      coalesce(p_summary, ''),
      false,
      coalesce(p_enabled, true),
      coalesce(map, 'staff')
    )
    returning * into row;
  end if;

  return to_jsonb(row);
end;
$$;

revoke all on function public.save_society_role(bigint, text, text, boolean, text) from public, anon;
grant execute on function public.save_society_role(bigint, text, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Set duties of a role
-- ---------------------------------------------------------------------------

create or replace function public.set_role_tasks(p_role_key text, p_task_keys text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rid bigint;
  keys text[] := coalesce(p_task_keys, '{}');
begin
  perform public.require_society_office();
  select id into rid from public.society_roles where key = p_role_key;
  if rid is null then
    raise exception 'That role was not found.';
  end if;

  delete from public.society_role_tasks where role_id = rid;
  insert into public.society_role_tasks (role_id, task_id)
  select rid, t.id
  from public.society_tasks t
  where t.key = any (keys)
    and t.enabled
  on conflict do nothing;

  return public.list_society_catalog();
end;
$$;

revoke all on function public.set_role_tasks(text, text[]) from public, anon;
grant execute on function public.set_role_tasks(text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Extra duty on a person
-- ---------------------------------------------------------------------------

create or replace function public.set_person_extra_tasks(p_user_id uuid, p_task_keys text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  keys text[] := coalesce(p_task_keys, '{}');
begin
  perform public.require_society_office();
  if p_user_id is null then
    raise exception 'Pick a person.';
  end if;

  delete from public.society_person_tasks where user_id = p_user_id;
  insert into public.society_person_tasks (user_id, task_id)
  select p_user_id, t.id
  from public.society_tasks t
  where t.key = any (keys)
    and t.enabled
  on conflict do nothing;

  return public.list_society_catalog();
end;
$$;

revoke all on function public.set_person_extra_tasks(uuid, text[]) from public, anon;
grant execute on function public.set_person_extra_tasks(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

create or replace function public.save_society_reminder(
  p_id bigint default null,
  p_task_key text default null,
  p_user_id uuid default null,
  p_remind_at timestamptz default null,
  p_offset_minutes integer default 0,
  p_anchor text default 'absolute',
  p_repeat text default 'none',
  p_keep_informed boolean default true,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tid bigint;
  row public.society_reminders%rowtype;
  anch text := coalesce(nullif(p_anchor, ''), 'absolute');
  rep text := coalesce(nullif(p_repeat, ''), 'none');
begin
  perform public.require_society_office();
  if anch not in ('start', 'end', 'absolute', 'repeat') then
    raise exception 'Pick a valid reminder time.';
  end if;
  if rep not in ('none', 'daily', 'weekly') then
    raise exception 'Pick a valid repeat.';
  end if;

  if p_id is not null then
    select * into row from public.society_reminders where id = p_id;
    if not found then
      raise exception 'That reminder was not found.';
    end if;
    if p_task_key is not null then
      select id into tid from public.society_tasks where key = p_task_key;
      if tid is null then raise exception 'That work was not found.'; end if;
    else
      tid := row.task_id;
    end if;
    update public.society_reminders set
      task_id = tid,
      user_id = p_user_id,
      remind_at = p_remind_at,
      offset_minutes = coalesce(p_offset_minutes, offset_minutes),
      anchor = anch,
      repeat = rep,
      keep_informed = coalesce(p_keep_informed, keep_informed),
      enabled = coalesce(p_enabled, enabled)
    where id = p_id
    returning * into row;
  else
    if nullif(trim(coalesce(p_task_key, '')), '') is null then
      raise exception 'Pick work for this reminder.';
    end if;
    select id into tid from public.society_tasks where key = p_task_key;
    if tid is null then
      raise exception 'That work was not found.';
    end if;
    insert into public.society_reminders (
      task_id, user_id, remind_at, offset_minutes, anchor, repeat, keep_informed, enabled
    ) values (
      tid, p_user_id, p_remind_at, coalesce(p_offset_minutes, 0), anch, rep,
      coalesce(p_keep_informed, true), coalesce(p_enabled, true)
    )
    returning * into row;
  end if;

  return to_jsonb(row);
end;
$$;

revoke all on function public.save_society_reminder(bigint, text, uuid, timestamptz, integer, text, text, boolean, boolean) from public, anon;
grant execute on function public.save_society_reminder(bigint, text, uuid, timestamptz, integer, text, text, boolean, boolean) to authenticated;

create or replace function public.society_task_assignee_ids(p_task_id bigint, p_only_user uuid default null)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ids uuid[] := '{}';
  task_key text;
begin
  if p_only_user is not null then
    return array[p_only_user];
  end if;
  select key into task_key from public.society_tasks where id = p_task_id;
  if task_key is null then
    return '{}';
  end if;

  select coalesce(array_agg(distinct x.uid), '{}')
  into ids
  from (
    select pr.user_id as uid
    from public.society_role_tasks rt
    join public.society_roles r on r.id = rt.role_id and r.enabled
    join public.person_roles pr on pr.role = r.key
    where rt.task_id = p_task_id
    union
    select pt.user_id
    from public.society_person_tasks pt
    where pt.task_id = p_task_id
  ) x;

  return coalesce(ids, '{}');
end;
$$;

create or replace function public.flush_due_society_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rem record;
  due boolean;
  title text;
  body text;
  work_label text;
  recipients uuid[];
  admin_ids uuid[];
  uid uuid;
  sent int := 0;
  tpl text;
begin
  -- Portal push cron uses service_role; admins may also trigger manually.
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    perform public.require_society_office();
  end if;

  title := public.society_label('reminder_title', 'Duty reminder');
  tpl := public.society_label(
    'reminder_body',
    'Reminder: {{work}} — please check and complete this duty.'
  );

  select coalesce(array_agg(distinct u), '{}')
  into admin_ids
  from (
    select user_id as u from public.profiles where role = 'admin'
    union
    select user_id from public.person_roles where role = 'admin'
  ) a;

  for rem in
    select r.*, t.label as work_label, t.enabled as work_enabled, t.duration,
           t.starts_at, t.ends_at
    from public.society_reminders r
    join public.society_tasks t on t.id = r.task_id
    where r.enabled
      and t.enabled
      and (
        t.duration = 'regular'
        or t.ends_at is null
        or t.ends_at > now()
      )
  loop
    due := false;
    if rem.anchor = 'absolute' and rem.remind_at is not null then
      due := rem.remind_at <= now()
        and (rem.last_sent_at is null or rem.last_sent_at < rem.remind_at);
    elsif rem.anchor = 'start' and rem.starts_at is not null then
      due := (rem.starts_at - make_interval(mins => rem.offset_minutes)) <= now()
        and (rem.last_sent_at is null or rem.last_sent_at < rem.starts_at);
    elsif rem.anchor = 'end' and rem.ends_at is not null then
      due := (rem.ends_at - make_interval(mins => rem.offset_minutes)) <= now()
        and (rem.last_sent_at is null or rem.last_sent_at < rem.ends_at);
    elsif rem.anchor = 'repeat' then
      if rem.repeat = 'daily' then
        due := rem.last_sent_at is null
          or rem.last_sent_at < date_trunc('day', now());
      elsif rem.repeat = 'weekly' then
        due := rem.last_sent_at is null
          or rem.last_sent_at < date_trunc('week', now());
      end if;
    end if;

    if not due then
      continue;
    end if;

    work_label := rem.work_label;
    body := replace(tpl, '{{work}}', work_label);
    recipients := public.society_task_assignee_ids(rem.task_id, rem.user_id);
    if rem.keep_informed then
      recipients := (
        select coalesce(array_agg(distinct x), '{}')
        from unnest(recipients || admin_ids) as x
      );
    end if;

    foreach uid in array recipients
    loop
      insert into public.notifications (user_id, kind, title, body, href)
      values (uid, 'society_reminder', title, body, '/account/roles?tab=reminders');
    end loop;

    update public.society_reminders
      set last_sent_at = now()
    where id = rem.id;
    sent := sent + 1;
  end loop;

  return jsonb_build_object('ok', true, 'sent', sent);
end;
$$;

revoke all on function public.flush_due_society_reminders() from public, anon;
grant execute on function public.flush_due_society_reminders() to authenticated;
