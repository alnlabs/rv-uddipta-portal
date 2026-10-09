-- Phase 1 phone actions: cancel a pass, gate checks, staff tasks, deliveries.

alter table public.member_notes add column if not exists category text;

alter table public.visitor_passes drop constraint if exists visitor_passes_status_check;
alter table public.visitor_passes add constraint visitor_passes_status_check
  check (status in ('pending_approval', 'expected', 'waiting', 'inside', 'left', 'refused', 'cancelled'));

alter table public.visitor_passes add column if not exists host_answer text;
alter table public.visitor_passes drop constraint if exists visitor_passes_host_answer_check;
alter table public.visitor_passes add constraint visitor_passes_host_answer_check
  check (host_answer is null or host_answer in ('allowed', 'refused'));

drop policy if exists visitor_passes_security_read on public.visitor_passes;
create policy visitor_passes_security_read
on public.visitor_passes for select to authenticated
using (public.current_profile_role() in ('security', 'admin'));

grant select on public.work_orders to authenticated;

drop policy if exists work_orders_assigned on public.work_orders;
create policy work_orders_assigned
on public.work_orders for select to authenticated
using (
  assignee_user_id = auth.uid()
  or public.current_profile_role() in ('facility', 'admin')
);

create table if not exists public.deliveries (
  id bigint generated always as identity primary key,
  flat_number text not null,
  label text not null,
  status text not null default 'at_gate' check (status in ('at_gate', 'notified', 'collected')),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.deliveries enable row level security;
revoke all on public.deliveries from public, anon, authenticated;
grant select on public.deliveries to authenticated;

drop policy if exists deliveries_read on public.deliveries;
create policy deliveries_read
on public.deliveries for select to authenticated
using (
  public.current_profile_role() in ('security', 'admin')
  or flat_number in (
    select f.flat_number
    from public.profiles p
    join public.flats f on f.id = p.flat_id
    where p.user_id = auth.uid()
  )
);

create or replace function public.cancel_my_pass(pass_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  update public.visitor_passes
  set status = 'cancelled'
  where id = pass_id
    and host_user_id = auth.uid()
    and status in ('pending_approval', 'expected', 'waiting');
  if not found then
    raise exception 'That pass cannot be cancelled.';
  end if;
end;
$$;

revoke all on function public.cancel_my_pass(bigint) from public, anon;
grant execute on function public.cancel_my_pass(bigint) to authenticated;

create or replace function public.gate_lookup(pass_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.visitor_passes%rowtype;
begin
  if public.current_profile_role() not in ('security', 'admin') then
    raise exception 'The gate is for security.';
  end if;
  select * into row from public.visitor_passes where code = upper(trim(pass_code));
  if not found then
    return jsonb_build_object('found', false, 'valid', false);
  end if;
  return jsonb_build_object(
    'found', true,
    'id', row.id,
    'code', row.code,
    'name', row.visitor_name,
    'home', row.flat_number,
    'purpose', coalesce(row.purpose, 'Visitor'),
    'status', row.status,
    'date', row.visit_on,
    'answer', row.host_answer,
    'valid', row.status in ('expected', 'waiting', 'inside')
      and row.visit_on = current_date
      and coalesce(row.host_answer, '') <> 'refused'
  );
end;
$$;

revoke all on function public.gate_lookup(text) from public, anon;
grant execute on function public.gate_lookup(text) to authenticated;

create or replace function public.gate_set_status(pass_id bigint, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.visitor_passes%rowtype;
begin
  if public.current_profile_role() not in ('security', 'admin') then
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

revoke all on function public.gate_set_status(bigint, text) from public, anon;
grant execute on function public.gate_set_status(bigint, text) to authenticated;

create or replace function public.update_my_task(task_id bigint, next_status text, note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.work_orders%rowtype;
begin
  if next_status not in ('in_progress', 'done') then
    raise exception 'Choose start or done.';
  end if;
  select * into row from public.work_orders where id = task_id;
  if not found then
    raise exception 'That task is gone.';
  end if;
  if public.current_profile_role() = 'staff' and row.assignee_user_id is distinct from auth.uid() then
    raise exception 'This task is not yours.';
  end if;
  if public.current_profile_role() not in ('staff', 'facility', 'admin') then
    raise exception 'This desk is for service staff.';
  end if;
  update public.work_orders
  set status = next_status,
      body = case
        when length(trim(note)) > 0 then trim(both from body || E'\n' || trim(note))
        else body
      end
  where id = task_id;
end;
$$;

revoke all on function public.update_my_task(bigint, text, text) from public, anon;
grant execute on function public.update_my_task(bigint, text, text) to authenticated;

create or replace function public.record_delivery(home text, label text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  home_id bigint;
begin
  if public.current_profile_role() not in ('security', 'admin') then
    raise exception 'Deliveries are recorded at the gate.';
  end if;
  if length(trim(home)) < 2 or length(trim(label)) < 2 then
    raise exception 'Enter the home and what arrived.';
  end if;
  insert into public.deliveries (flat_number, label, status, recorded_by)
  values (upper(trim(home)), trim(label), 'notified', auth.uid());
  select id into home_id from public.flats where flat_number = upper(trim(home));
  if home_id is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    select user_id, 'delivery', 'Delivery at the gate', trim(label), '/notifications'
    from public.profiles
    where profiles.flat_id = home_id;
  end if;
end;
$$;

revoke all on function public.record_delivery(text, text) from public, anon;
grant execute on function public.record_delivery(text, text) to authenticated;

drop function if exists public.send_my_request(text);

create or replace function public.send_my_request(message text, category text default 'General')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  home text;
  note_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if length(trim(message)) < 2 then
    raise exception 'Write a few words first.';
  end if;
  select * into me from public.profiles where user_id = auth.uid();
  if me.role = 'visitor' then
    raise exception 'A visitor cannot send a request.';
  end if;
  select flat_number into home from public.flats where id = me.flat_id;
  insert into public.member_notes (author_user_id, flat_id, flat_number, author_name, kind, body, category)
  values (
    auth.uid(),
    me.flat_id,
    home,
    coalesce(nullif(me.display_name, ''), 'Resident'),
    'request',
    trim(message),
    coalesce(nullif(trim(category), ''), 'General')
  )
  returning id into note_id;
  insert into public.note_messages (note_id, author_user_id, author_name, from_office, body)
  values (note_id, auth.uid(), coalesce(nullif(me.display_name, ''), 'Resident'), false, trim(message));
end;
$$;

revoke all on function public.send_my_request(text, text) from public, anon;
grant execute on function public.send_my_request(text, text) to authenticated;

create or replace function public.answer_arrival(pass_id bigint, allow boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  update public.visitor_passes
  set host_answer = case when allow then 'allowed' else 'refused' end,
      status = case when allow then status else 'refused' end
  where id = pass_id
    and host_user_id = auth.uid()
    and status = 'waiting';
  if not found then
    raise exception 'This visitor is not waiting for you.';
  end if;
end;
$$;

revoke all on function public.answer_arrival(bigint, boolean) from public, anon;
grant execute on function public.answer_arrival(bigint, boolean) to authenticated;

create table if not exists public.notice_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_id bigint not null references public.activity_events (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);

alter table public.notice_reads enable row level security;
revoke all on public.notice_reads from public, anon, authenticated;
grant select, insert on public.notice_reads to authenticated;

drop policy if exists notice_reads_own on public.notice_reads;
create policy notice_reads_own
on public.notice_reads for select to authenticated
using (user_id = auth.uid());

drop policy if exists notice_reads_insert_own on public.notice_reads;
create policy notice_reads_insert_own
on public.notice_reads for insert to authenticated
with check (user_id = auth.uid());
