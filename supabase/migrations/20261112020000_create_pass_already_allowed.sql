-- When a resident creates their own gate pass, it is already allowed.
-- host_approval only applies to arrivals that need a decision (e.g. at the gate).

create or replace function public.create_my_pass(
  visitor_name text,
  phone text,
  purpose text,
  visit_on date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  home text;
  next_code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if length(trim(visitor_name)) < 2 then
    raise exception 'Enter the visitor''s name.';
  end if;
  select * into me from public.profiles where user_id = auth.uid();
  if me.flat_id is null or me.role = 'visitor' then
    raise exception 'Link a home before creating a pass.';
  end if;
  select flat_number into home from public.flats where id = me.flat_id;
  next_code := '';
  for i in 1..8 loop
    next_code := next_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  insert into public.visitor_passes (
    code, flat_id, flat_number, host_user_id, visitor_name, visitor_phone, purpose, visit_on, status, host_answer
  ) values (
    next_code,
    me.flat_id,
    home,
    auth.uid(),
    trim(visitor_name),
    nullif(trim(phone), ''),
    trim(purpose),
    coalesce(visit_on, current_date),
    'expected',
    'allowed'
  );
  return next_code;
end;
$$;

revoke all on function public.create_my_pass(text, text, text, date) from public, anon;
grant execute on function public.create_my_pass(text, text, text, date) to authenticated;

-- Clear confusing self-approval queue for invites already created by the host.
update public.visitor_passes
set status = 'expected',
    host_answer = coalesce(host_answer, 'allowed')
where status = 'pending_approval';
