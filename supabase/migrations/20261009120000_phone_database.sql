-- The phone reads and writes as the signed-in person. It does not use the service key.

grant select on public.person_roles to authenticated;

drop policy if exists person_roles_read_own on public.person_roles;
create policy person_roles_read_own
on public.person_roles for select to authenticated
using (user_id = auth.uid());

grant select on public.member_posts to authenticated;

drop policy if exists member_posts_read on public.member_posts;
create policy member_posts_read
on public.member_posts for select to authenticated
using (auth.uid() is not null);

grant select on public.visitor_passes to authenticated;

drop policy if exists visitor_passes_read_own on public.visitor_passes;
create policy visitor_passes_read_own
on public.visitor_passes for select to authenticated
using (
  host_user_id = auth.uid()
  or flat_id in (
    select p.flat_id from public.profiles p
    where p.user_id = auth.uid() and p.flat_id is not null
  )
);

grant select on public.member_notes to authenticated;

drop policy if exists member_notes_read_own on public.member_notes;
create policy member_notes_read_own
on public.member_notes for select to authenticated
using (author_user_id = auth.uid());

grant select on public.note_messages to authenticated;

drop policy if exists note_messages_read_own on public.note_messages;
create policy note_messages_read_own
on public.note_messages for select to authenticated
using (
  note_id in (
    select n.id from public.member_notes n where n.author_user_id = auth.uid()
  )
);

create or replace function public.switch_my_role(next_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  held public.person_roles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into held
  from public.person_roles
  where user_id = auth.uid() and role = next_role;
  if not found then
    raise exception 'That role is not on this account.';
  end if;
  update public.profiles
  set role = held.role, flat_id = held.flat_id
  where user_id = auth.uid();
  update public.flats set user_id = null where user_id = auth.uid();
  if held.role = 'owner' and held.flat_id is not null then
    update public.flats set user_id = auth.uid() where id = held.flat_id;
  end if;
end;
$$;

revoke all on function public.switch_my_role(text) from public, anon;
grant execute on function public.switch_my_role(text) to authenticated;

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
  needs_host boolean;
  next_status text;
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
  select host_approval into needs_host from public.project_info where id = 1;
  next_status := case when coalesce(needs_host, true) then 'pending_approval' else 'expected' end;
  next_code := '';
  for i in 1..8 loop
    next_code := next_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  insert into public.visitor_passes (
    code, flat_id, flat_number, host_user_id, visitor_name, visitor_phone, purpose, visit_on, status
  ) values (
    next_code,
    me.flat_id,
    home,
    auth.uid(),
    trim(visitor_name),
    nullif(trim(phone), ''),
    trim(purpose),
    coalesce(visit_on, current_date),
    next_status
  );
  return next_code;
end;
$$;

revoke all on function public.create_my_pass(text, text, text, date) from public, anon;
grant execute on function public.create_my_pass(text, text, text, date) to authenticated;

create or replace function public.decide_my_pass(pass_id bigint, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if next_status not in ('expected', 'refused') then
    raise exception 'Choose allow or refuse.';
  end if;
  update public.visitor_passes
  set status = next_status
  where id = pass_id
    and host_user_id = auth.uid()
    and status = 'pending_approval';
  if not found then
    raise exception 'That pass cannot be changed.';
  end if;
end;
$$;

revoke all on function public.decide_my_pass(bigint, text) from public, anon;
grant execute on function public.decide_my_pass(bigint, text) to authenticated;

create or replace function public.send_my_request(message text)
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
  insert into public.member_notes (author_user_id, flat_id, flat_number, author_name, kind, body)
  values (
    auth.uid(),
    me.flat_id,
    home,
    coalesce(nullif(me.display_name, ''), 'Resident'),
    'request',
    trim(message)
  )
  returning id into note_id;
  insert into public.note_messages (note_id, author_user_id, author_name, from_office, body)
  values (
    note_id,
    auth.uid(),
    coalesce(nullif(me.display_name, ''), 'Resident'),
    false,
    trim(message)
  );
end;
$$;

revoke all on function public.send_my_request(text) from public, anon;
grant execute on function public.send_my_request(text) to authenticated;

create or replace function public.reply_my_request(target_note bigint, message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
  note public.member_notes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if length(trim(message)) < 1 then
    raise exception 'Write a reply first.';
  end if;
  select * into note
  from public.member_notes
  where id = target_note and author_user_id = auth.uid();
  if not found then
    raise exception 'That request is not yours.';
  end if;
  if note.status = 'done' then
    raise exception 'That request is done.';
  end if;
  select * into me from public.profiles where user_id = auth.uid();
  insert into public.note_messages (note_id, author_user_id, author_name, from_office, body)
  values (
    target_note,
    auth.uid(),
    coalesce(nullif(me.display_name, ''), 'Resident'),
    false,
    trim(message)
  );
end;
$$;

revoke all on function public.reply_my_request(bigint, text) from public, anon;
grant execute on function public.reply_my_request(bigint, text) to authenticated;
