-- Security marks daily staff attendance. Staff and admin can view.
-- Syncs profiles.on_duty so the jobs desk stays aligned.

create table if not exists public.staff_attendance (
  id bigserial primary key,
  person_id uuid not null references auth.users (id) on delete cascade,
  duty_on date not null default current_date,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid references auth.users (id) on delete set null,
  marked_at timestamptz not null default now(),
  note text,
  unique (person_id, duty_on)
);

create index if not exists staff_attendance_day_idx
  on public.staff_attendance (duty_on desc, person_id);

alter table public.staff_attendance enable row level security;

revoke all on public.staff_attendance from public, anon, authenticated;
grant select, insert, update, delete on public.staff_attendance to service_role;
grant usage, select on sequence public.staff_attendance_id_seq to service_role;

create or replace function public.list_staff_attendance(duty_on date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor text := public.current_profile_role();
  day date := coalesce(duty_on, current_date);
  can_mark boolean := false;
  people jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;

  if actor = 'security' then
    perform public.phone_require('gate', 'manage');
    can_mark := true;
  elsif actor in ('admin', 'facility', 'staff') then
    null;
  elsif public.is_platform_admin() then
    null;
  else
    raise exception 'Attendance is for security, staff, and admin.';
  end if;

  -- Security marks; staff, facility, and admin all see the full roster for the day.
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
    into people
  from (
    select
      p.user_id::text as id,
      coalesce(nullif(trim(p.display_name), ''), 'Staff') as name,
      p.role,
      case p.role
        when 'facility' then 'Facility'
        when 'staff' then 'Staff'
        else initcap(p.role)
      end as "roleLabel",
      coalesce(p.on_duty, false) as "onDuty",
      a.status,
      a.marked_at as "markedAt"
    from public.profiles p
    left join public.staff_attendance a
      on a.person_id = p.user_id
     and a.duty_on = day
    where p.role in ('staff', 'facility')
  ) x;

  return jsonb_build_object(
    'dutyOn', day,
    'canMark', can_mark,
    'people', people
  );
end;
$$;

revoke all on function public.list_staff_attendance(date) from public, anon;
grant execute on function public.list_staff_attendance(date) to authenticated;

create or replace function public.mark_staff_attendance(
  person_id uuid,
  status text,
  duty_on date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  day date := coalesce(duty_on, current_date);
  next_status text := lower(trim(status));
  person public.profiles%rowtype;
  who text;
begin
  perform public.require_role(array['security']);
  perform public.phone_require('gate', 'manage');

  if next_status not in ('present', 'absent') then
    raise exception 'Choose present or absent.';
  end if;
  if person_id is null then
    raise exception 'Choose a person.';
  end if;

  select * into person from public.profiles where user_id = mark_staff_attendance.person_id;
  if not found then
    raise exception 'That person was not found.';
  end if;
  if person.role not in ('staff', 'facility') then
    raise exception 'Attendance is only for staff and facility.';
  end if;

  insert into public.staff_attendance (person_id, duty_on, status, marked_by, marked_at)
  values (mark_staff_attendance.person_id, day, next_status, auth.uid(), now())
  on conflict (person_id, duty_on) do update
    set status = excluded.status,
        marked_by = excluded.marked_by,
        marked_at = excluded.marked_at;

  update public.profiles
  set on_duty = (next_status = 'present')
  where user_id = mark_staff_attendance.person_id;

  who := coalesce(nullif(trim(person.display_name), ''), 'Staff');
  return jsonb_build_object(
    'ok', true,
    'message',
      case
        when next_status = 'present' then who || ' marked present.'
        else who || ' marked absent.'
      end,
    'status', next_status
  );
end;
$$;

revoke all on function public.mark_staff_attendance(uuid, text, date) from public, anon;
grant execute on function public.mark_staff_attendance(uuid, text, date) to authenticated;
