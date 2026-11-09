alter table public.registration_requests
  drop constraint if exists registration_requests_request_kind_check;

alter table public.registration_requests
  add constraint registration_requests_request_kind_check
  check (request_kind in ('owner', 'family', 'tenant'));

create or replace function public.gate_lookup(pass_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.visitor_passes%rowtype;
  approval boolean;
begin
  if public.current_profile_role() not in ('security', 'admin') then
    raise exception 'The gate is for security.';
  end if;
  select * into row from public.visitor_passes where code = upper(trim(pass_code));
  if not found then
    return jsonb_build_object('found', false, 'valid', false);
  end if;
  select coalesce(host_approval, true) into approval from public.project_info where id = 1;
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
    'valid', row.visit_on = current_date
      and coalesce(row.host_answer, '') <> 'refused'
      and (
        row.status = 'inside'
        or row.status = 'expected'
        or (
          row.status = 'waiting'
          and (coalesce(row.host_answer, '') = 'allowed' or not coalesce(approval, true))
        )
      )
  );
end;
$$;

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
    and status = 'waiting'
    and (
      host_user_id = auth.uid()
      or flat_id in (
        select flat_id from public.profiles
        where user_id = auth.uid() and flat_id is not null
        union
        select flat_id from public.person_roles
        where user_id = auth.uid() and flat_id is not null
      )
    );
  if not found then
    raise exception 'This visitor is not waiting for you.';
  end if;
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
      '/pass/' || row.id::text
    );
  end if;
end;
$$;

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
  if next_status = 'done' and row.source_note_id is not null then
    update public.member_notes set status = 'done' where id = row.source_note_id;
  end if;
end;
$$;

alter table public.deliveries drop constraint if exists deliveries_status_check;
alter table public.deliveries add constraint deliveries_status_check
  check (status in ('at_gate', 'notified', 'collected', 'held'));

drop function if exists public.record_delivery(text, text);

create function public.record_delivery(home text, label text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  home_id bigint;
  told integer := 0;
begin
  if public.current_profile_role() not in ('security', 'admin') then
    raise exception 'Deliveries are recorded at the gate.';
  end if;
  if length(trim(home)) < 2 or length(trim(label)) < 2 then
    raise exception 'Enter the home and what arrived.';
  end if;
  select id into home_id from public.flats where flat_number = upper(trim(home));
  if home_id is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    select user_id, 'delivery', 'Delivery at the gate', trim(label), '/notifications'
    from public.profiles
    where profiles.flat_id = home_id;
    get diagnostics told = row_count;
  end if;
  insert into public.deliveries (flat_number, label, status, recorded_by)
  values (
    upper(trim(home)),
    trim(label),
    case when told > 0 then 'notified' else 'held' end,
    auth.uid()
  );
  return jsonb_build_object('notified', told > 0);
end;
$$;

revoke all on function public.record_delivery(text, text) from public, anon;
grant execute on function public.record_delivery(text, text) to authenticated;
