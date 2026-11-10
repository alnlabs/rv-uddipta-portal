-- User-facing errors: drop the word "desk".

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
    raise exception 'This is for service staff.';
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
