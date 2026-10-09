-- Phone community writes. The signed-in person posts, replies, votes, and
-- sends forms through these functions. The service key stays on the website.

create table if not exists public.member_post_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.member_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.member_post_reports enable row level security;
revoke all on public.member_post_reports from public, anon, authenticated;

drop policy if exists post_photos_public_read on storage.objects;
create policy post_photos_public_read
on storage.objects for select
to public
using (bucket_id = 'post-photos');

drop policy if exists post_photos_member_insert on storage.objects;
create policy post_photos_member_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and split_part(name, '/', 1) = 'posts'
  and split_part(name, '/', 2) ~ '^[0-9]+$'
  and split_part(name, '/', 3) ~ '^[0-9]+\.(jpg|jpeg|png|webp)$'
  and split_part(name, '/', 4) = ''
  and exists (
    select 1
    from public.member_posts post
    where post.id = split_part(name, '/', 2)::bigint
      and post.author_user_id = auth.uid()
  )
);

create or replace function public.phone_access(feature text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_role text;
  turned_on boolean;
  saved text;
begin
  if auth.uid() is null then
    return 'none';
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();
  if actor_role is null or actor_role = 'visitor' then
    return 'none';
  end if;
  select enabled into turned_on from public.community_features where key = feature;
  if turned_on is false then
    return 'none';
  end if;
  select access into saved
  from public.role_permissions
  where role = actor_role and feature_key = feature;
  if saved in ('none', 'view', 'manage') then
    return saved;
  end if;
  if actor_role = 'admin' then
    return 'manage';
  end if;
  if feature in ('feed', 'events', 'polls', 'forms', 'announcements')
     and actor_role in ('owner', 'co_owner', 'tenant', 'committee', 'facility', 'staff', 'security', 'builder') then
    return 'manage';
  end if;
  return 'none';
end;
$$;

create or replace function public.phone_require(feature text, level text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_role text;
  access text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();
  if actor_role is null or actor_role = 'visitor' then
    raise exception 'You can do this after your flat is approved.';
  end if;
  access := public.phone_access(feature);
  if access = 'none' then
    raise exception 'This is not available on your account.';
  end if;
  if level = 'manage' and access <> 'manage' then
    raise exception 'You can look at this. You cannot change it.';
  end if;
end;
$$;

create or replace function public.phone_can_see(kind text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if kind in ('request', 'feedback') then
    return false;
  end if;
  if kind in ('event', 'celebration') then
    return public.phone_access('events') <> 'none';
  end if;
  if kind = 'poll' then
    return public.phone_access('polls') <> 'none';
  end if;
  return public.phone_access('feed') <> 'none';
end;
$$;

create or replace function public.phone_kind_label(kind text)
returns text
language sql
immutable
as $$
  select case kind
    when 'question' then 'Question'
    when 'quote' then 'Quote'
    when 'celebration' then 'Celebration'
    when 'sale' then 'For sale'
    when 'wanted' then 'Wanted'
    when 'giveaway' then 'Giveaway'
    when 'lost' then 'Lost & found'
    when 'recommendation' then 'Recommendation'
    when 'parking' then 'Parking'
    when 'event' then 'Event'
    when 'poll' then 'Poll'
    when 'alert' then 'Alert'
    when 'emergency' then 'Emergency'
    else 'Update'
  end;
$$;

create or replace function public.phone_publish(
  event_kind text,
  event_title text,
  event_body text,
  home_id bigint,
  event_href text,
  event_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id bigint;
begin
  insert into public.activity_events (actor_user_id, flat_id, kind, title, body, payload, visibility)
  values (auth.uid(), home_id, event_kind, event_title, event_body, coalesce(event_payload, '{}'::jsonb), 'community')
  returning id into event_id;

  insert into public.notifications (user_id, activity_id, kind, title, body, href)
  select profile.user_id, event_id, event_kind, event_title, event_body, event_href
  from public.profiles profile
  where profile.user_id <> auth.uid()
    and profile.role in ('admin', 'builder', 'owner', 'co_owner', 'tenant', 'committee', 'facility', 'staff', 'security');
end;
$$;

create or replace function public.phone_post_json(target bigint, with_replies boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  actor_role text;
  option_rows jsonb;
  reply_rows jsonb;
begin
  select * into post from public.member_posts where id = target;
  if not found then
    return null;
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', option.id,
    'label', option.label,
    'votes', (select count(*) from public.member_poll_votes vote where vote.option_id = option.id),
    'mine', exists (
      select 1 from public.member_poll_votes vote
      where vote.option_id = option.id and vote.user_id = auth.uid()
    )
  ) order by option.position), '[]'::jsonb)
  into option_rows
  from public.member_poll_options option
  where option.post_id = post.id;

  reply_rows := '[]'::jsonb;
  if with_replies then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', reply.id,
      'author', reply.author_name,
      'flat', reply.flat_number,
      'body', reply.body,
      'at', reply.created_at,
      'mine', reply.author_user_id = auth.uid(),
      'canDelete', reply.author_user_id = auth.uid() or actor_role = 'admin'
    ) order by reply.created_at), '[]'::jsonb)
    into reply_rows
    from public.member_replies reply
    where reply.post_id = post.id;
  end if;

  return jsonb_build_object(
    'id', post.id,
    'kind', post.kind,
    'body', post.body,
    'author', post.author_name,
    'flat', post.flat_number,
    'at', post.created_at,
    'image', post.image_url,
    'startsOn', post.starts_on,
    'closed', post.closed_at is not null,
    'sold', post.sold_at is not null,
    'multiple', coalesce(post.poll_multiple, false),
    'mine', post.author_user_id = auth.uid(),
    'canDelete', post.author_user_id = auth.uid() or actor_role = 'admin',
    'canClose', post.kind = 'poll' and post.closed_at is null and (post.author_user_id = auth.uid() or actor_role = 'admin'),
    'reported', exists (
      select 1 from public.member_post_reports report
      where report.post_id = post.id and report.user_id = auth.uid()
    ),
    'replies', (select count(*) from public.member_replies reply where reply.post_id = post.id),
    'helpful', (select count(*) from public.member_post_reactions reaction where reaction.post_id = post.id and reaction.kind = 'helpful'),
    'thanks', (select count(*) from public.member_post_reactions reaction where reaction.post_id = post.id and reaction.kind = 'thanks'),
    'reaction', (
      select reaction.kind from public.member_post_reactions reaction
      where reaction.post_id = post.id and reaction.user_id = auth.uid()
    ),
    'going', exists (
      select 1 from public.member_event_rsvps rsvp
      where rsvp.post_id = post.id and rsvp.user_id = auth.uid()
    ),
    'goingCount', (select count(*) from public.member_event_rsvps rsvp where rsvp.post_id = post.id),
    'options', option_rows,
    'thread', reply_rows
  );
end;
$$;

create or replace function public.community_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  posts jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select coalesce(jsonb_agg(public.phone_post_json(picked.id, false) order by picked.created_at desc), '[]'::jsonb)
  into posts
  from (
    select post.id, post.created_at
    from public.member_posts post
    where public.phone_can_see(post.kind)
    order by post.created_at desc
    limit 60
  ) picked;

  return jsonb_build_object(
    'access', jsonb_build_object(
      'feed', public.phone_access('feed'),
      'events', public.phone_access('events'),
      'polls', public.phone_access('polls'),
      'forms', public.phone_access('forms')
    ),
    'posts', posts
  );
end;
$$;

create or replace function public.post_thread(target bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  post_kind text;
  card jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select kind into post_kind from public.member_posts where id = target;
  if post_kind is null then
    raise exception 'That post is gone.';
  end if;
  if not public.phone_can_see(post_kind) then
    raise exception 'This is not available on your account.';
  end if;
  card := public.phone_post_json(target, true);
  return jsonb_build_object(
    'access', jsonb_build_object(
      'feed', public.phone_access('feed'),
      'events', public.phone_access('events'),
      'polls', public.phone_access('polls'),
      'forms', public.phone_access('forms')
    ),
    'post', card
  );
end;
$$;

create or replace function public.create_my_post(
  kind text,
  message text,
  event_on date default null,
  choices text[] default null,
  allow_multiple boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  home text;
  member_name text;
  feature text;
  clean text[] := '{}';
  choice text;
  lowered text;
  new_id bigint;
  title text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if kind not in (
    'update', 'question', 'quote', 'celebration', 'sale', 'wanted', 'giveaway',
    'lost', 'recommendation', 'parking', 'event', 'poll', 'alert'
  ) then
    raise exception 'Choose a type.';
  end if;
  if exists (
    select 1 from public.categories
    where module = 'community' and value = kind and enabled = false
  ) then
    raise exception 'That type is turned off.';
  end if;
  feature := case
    when kind in ('event', 'celebration') then 'events'
    when kind = 'poll' then 'polls'
    else 'feed'
  end;
  perform public.phone_require(feature, 'manage');

  select * into actor from public.profiles where user_id = auth.uid();
  if not found then
    raise exception 'You can do this after your flat is approved.';
  end if;
  home := null;
  if actor.flat_id is not null then
    select flat_number into home from public.flats where id = actor.flat_id;
  end if;
  member_name := coalesce(nullif(trim(actor.display_name), ''), nullif(auth.jwt() ->> 'email', ''), 'A member');

  message := trim(message);
  if char_length(message) < 2 then
    raise exception 'Write the description before posting.';
  end if;
  if kind = 'quote' and char_length(message) > 240 then
    raise exception 'Keep a quote under 240 characters.';
  end if;
  if char_length(message) > 4000 then
    message := left(message, 4000);
  end if;

  if kind in ('event', 'celebration') then
    if event_on is null then
      raise exception 'Choose the date for this post.';
    end if;
  else
    event_on := null;
  end if;

  if kind = 'poll' then
    if choices is null then
      raise exception 'Add at least two poll choices.';
    end if;
    foreach choice in array choices loop
      choice := trim(choice);
      if choice = '' then
        continue;
      end if;
      if char_length(choice) > 80 then
        raise exception 'Keep each choice under 80 characters.';
      end if;
      lowered := lower(choice);
      if exists (select 1 from unnest(clean) as item where lower(item) = lowered) then
        raise exception 'Each choice needs to be different.';
      end if;
      clean := clean || choice;
    end loop;
    if cardinality(clean) < 2 then
      raise exception 'Add at least two poll choices.';
    end if;
    if cardinality(clean) > 6 then
      raise exception 'A poll can have up to six choices.';
    end if;
  end if;

  insert into public.member_posts (
    author_user_id, flat_id, flat_number, author_name, kind, body, starts_on, poll_multiple
  ) values (
    auth.uid(),
    actor.flat_id,
    home,
    member_name,
    kind,
    message,
    event_on,
    kind = 'poll' and coalesce(allow_multiple, false)
  )
  returning id into new_id;

  if kind = 'poll' then
    insert into public.member_poll_options (post_id, label, position)
    select new_id, item.label, item.position
    from unnest(clean) with ordinality as item(label, position);
  end if;

  title := public.phone_kind_label(kind) || ' · ' || member_name;
  if home is not null then
    title := title || ' · ' || home;
  end if;
  perform public.phone_publish(
    'member_post',
    title,
    message,
    actor.flat_id,
    'post/' || new_id::text,
    jsonb_build_object('post_id', new_id)
  );
  return new_id;
end;
$$;

create or replace function public.edit_my_post(
  target bigint,
  message text,
  event_on date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  feature text;
begin
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That post is gone.';
  end if;
  if post.author_user_id <> auth.uid() then
    raise exception 'You can edit your own post.';
  end if;
  feature := case
    when post.kind in ('event', 'celebration') then 'events'
    when post.kind = 'poll' then 'polls'
    else 'feed'
  end;
  perform public.phone_require(feature, 'manage');
  message := trim(message);
  if char_length(message) < 2 then
    raise exception 'Write the description before posting.';
  end if;
  if post.kind = 'quote' and char_length(message) > 240 then
    raise exception 'Keep a quote under 240 characters.';
  end if;
  if char_length(message) > 4000 then
    message := left(message, 4000);
  end if;
  if post.kind in ('event', 'celebration') then
    if event_on is null then
      raise exception 'Choose the date for this post.';
    end if;
    update public.member_posts set body = message, starts_on = event_on where id = target;
  else
    update public.member_posts set body = message where id = target;
  end if;
end;
$$;

create or replace function public.delete_my_post(target bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That post is gone.';
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();
  if post.author_user_id <> auth.uid() and actor_role <> 'admin' then
    raise exception 'You can delete your own post.';
  end if;
  delete from public.notifications where href = 'post/' || target::text;
  delete from public.activity_events
  where kind = 'member_post' and payload ->> 'post_id' = target::text;
  delete from public.member_posts where id = target;
end;
$$;

create or replace function public.attach_my_post_photo(target bigint, image_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  feature text;
  object_name text;
begin
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That post is gone.';
  end if;
  if post.author_user_id <> auth.uid() then
    raise exception 'You can add a photo to your own post.';
  end if;
  if post.kind not in ('sale', 'lost', 'event', 'recommendation', 'wanted', 'giveaway', 'parking', 'celebration', 'emergency') then
    raise exception 'This type does not take a photo.';
  end if;
  feature := case
    when post.kind in ('event', 'celebration') then 'events'
    else 'feed'
  end;
  perform public.phone_require(feature, 'manage');
  object_name := substring(image_url from '/post-photos/(posts/[0-9]+/[0-9]+\.(jpg|jpeg|png|webp))$');
  if object_name is null or object_name not like 'posts/' || target::text || '/%' then
    raise exception 'That photo is not saved.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'post-photos' and name = object_name
  ) then
    raise exception 'That photo is not saved.';
  end if;
  update public.member_posts set image_url = image_url where id = target;
end;
$$;

create or replace function public.reply_to_post(target bigint, message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  actor public.profiles%rowtype;
  home text;
  member_name text;
begin
  perform public.phone_require('feed', 'manage');
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That post is gone.';
  end if;
  if not public.phone_can_see(post.kind) then
    raise exception 'That post is gone.';
  end if;
  message := trim(message);
  if char_length(message) < 1 then
    raise exception 'Write a reply first.';
  end if;
  if char_length(message) > 2000 then
    message := left(message, 2000);
  end if;
  select * into actor from public.profiles where user_id = auth.uid();
  home := null;
  if actor.flat_id is not null then
    select flat_number into home from public.flats where id = actor.flat_id;
  end if;
  member_name := coalesce(nullif(trim(actor.display_name), ''), nullif(auth.jwt() ->> 'email', ''), 'A member');
  insert into public.member_replies (post_id, author_user_id, author_name, flat_number, body)
  values (target, auth.uid(), member_name, home, message);
  if post.author_user_id is not null and post.author_user_id <> auth.uid() then
    insert into public.notifications (user_id, kind, title, body, href)
    values (post.author_user_id, 'reply', member_name || ' replied', message, 'post/' || target::text);
  end if;
end;
$$;

create or replace function public.delete_my_reply(target bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reply public.member_replies%rowtype;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into reply from public.member_replies where id = target;
  if not found then
    raise exception 'That reply is gone.';
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();
  if reply.author_user_id <> auth.uid() and actor_role <> 'admin' then
    raise exception 'You can delete your own reply.';
  end if;
  delete from public.member_replies where id = target;
end;
$$;

create or replace function public.react_to_post(target bigint, reaction_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  post_kind text;
  existing text;
begin
  perform public.phone_require('feed', 'manage');
  if reaction_kind not in ('helpful', 'thanks') then
    raise exception 'Choose a reaction.';
  end if;
  select kind into post_kind from public.member_posts where id = target;
  if post_kind is null or not public.phone_can_see(post_kind) then
    raise exception 'That post is gone.';
  end if;
  select kind into existing
  from public.member_post_reactions
  where post_id = target and user_id = auth.uid();
  if existing = reaction_kind then
    delete from public.member_post_reactions where post_id = target and user_id = auth.uid();
    return '';
  elsif existing is not null then
    update public.member_post_reactions
    set kind = reaction_kind
    where post_id = target and user_id = auth.uid();
    return reaction_kind;
  else
    insert into public.member_post_reactions (post_id, user_id, kind)
    values (target, auth.uid(), reaction_kind);
    return reaction_kind;
  end if;
end;
$$;

create or replace function public.rsvp_my_event(target bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  post_kind text;
begin
  perform public.phone_require('events', 'manage');
  select kind into post_kind from public.member_posts where id = target;
  if post_kind is null then
    raise exception 'That event is gone.';
  end if;
  if post_kind <> 'event' then
    raise exception 'Only events take an RSVP.';
  end if;
  if exists (
    select 1 from public.member_event_rsvps
    where post_id = target and user_id = auth.uid()
  ) then
    delete from public.member_event_rsvps where post_id = target and user_id = auth.uid();
    return 'cleared';
  end if;
  insert into public.member_event_rsvps (post_id, user_id)
  values (target, auth.uid());
  return 'going';
end;
$$;

create or replace function public.vote_my_poll(target bigint, choice_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  option_post bigint;
begin
  perform public.phone_require('polls', 'manage');
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That is not a poll.';
  end if;
  if post.kind <> 'poll' then
    raise exception 'That is not a poll.';
  end if;
  if post.closed_at is not null then
    raise exception 'Voting is closed.';
  end if;
  select poll.post_id into option_post
  from public.member_poll_options poll
  where poll.id = choice_id;
  if option_post is null or option_post <> target then
    raise exception 'That choice is gone.';
  end if;
  if coalesce(post.poll_multiple, false) then
    if exists (
      select 1 from public.member_poll_votes vote
      where vote.post_id = target and vote.user_id = auth.uid() and vote.option_id = choice_id
    ) then
      delete from public.member_poll_votes vote
      where vote.post_id = target and vote.user_id = auth.uid() and vote.option_id = choice_id;
    else
      insert into public.member_poll_votes (post_id, option_id, user_id)
      values (target, choice_id, auth.uid());
    end if;
  else
    delete from public.member_poll_votes vote
    where vote.post_id = target and vote.user_id = auth.uid();
    insert into public.member_poll_votes (post_id, option_id, user_id)
    values (target, choice_id, auth.uid());
  end if;
end;
$$;

create or replace function public.close_my_poll(target bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post public.member_posts%rowtype;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into post from public.member_posts where id = target;
  if not found or post.kind <> 'poll' then
    raise exception 'That is not a poll.';
  end if;
  if post.closed_at is not null then
    raise exception 'Voting is already closed.';
  end if;
  select role into actor_role from public.profiles where user_id = auth.uid();
  if post.author_user_id <> auth.uid() and actor_role <> 'admin' then
    raise exception 'You can close your own poll.';
  end if;
  update public.member_posts set closed_at = now() where id = target;
end;
$$;

create or replace function public.report_my_post(target bigint, reason text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  post_kind text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select kind into post_kind from public.member_posts where id = target;
  if post_kind is null or not public.phone_can_see(post_kind) then
    raise exception 'That post is gone.';
  end if;
  reason := trim(reason);
  if char_length(reason) < 4 then
    raise exception 'Say a little more about what is wrong.';
  end if;
  if char_length(reason) > 400 then
    reason := left(reason, 400);
  end if;
  insert into public.member_post_reports (post_id, user_id, reason)
  values (target, auth.uid(), reason)
  on conflict (post_id, user_id) do nothing;
  return 'saved';
end;
$$;

create or replace function public.list_my_forms()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
  home text;
  forms jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  select * into actor from public.profiles where user_id = auth.uid();
  home := null;
  if actor.flat_id is not null then
    select flat_number into home from public.flats where id = actor.flat_id;
  end if;

  select coalesce(jsonb_agg(form_row order by form_row ->> 'title'), '[]'::jsonb)
  into forms
  from (
    select jsonb_build_object(
      'id', enquiry.id,
      'title', enquiry.title,
      'note', coalesce(enquiry.note, ''),
      'closed', enquiry.closed_at is not null,
      'results', enquiry.results_view,
      'homes', case
        when enquiry.results_view = 'community' then (
          select count(*) from public.enquiry_responses response where response.enquiry_id = enquiry.id
        )
        else null
      end,
      'submitted', response.id is not null,
      'phone', response.phone,
      'fields', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', field.id,
          'kind', field.kind,
          'label', field.label,
          'required', field.required,
          'choices', coalesce(to_jsonb(field.choices), '[]'::jsonb)
        ) order by field.sort_order, field.id)
        from public.enquiry_fields field
        where field.enquiry_id = enquiry.id
      ), '[]'::jsonb),
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object('fieldId', answer.field_id, 'value', answer.value))
        from public.enquiry_answers answer
        where answer.response_id = response.id
      ), '[]'::jsonb)
    ) as form_row
    from public.enquiries enquiry
    left join public.enquiry_responses response
      on response.enquiry_id = enquiry.id
     and response.flat_number = home
    where public.phone_access('forms') <> 'none'
      and (enquiry.visibility = 'public' or public.phone_access('forms') <> 'none')
  ) listed;

  return jsonb_build_object(
    'access', public.phone_access('forms'),
    'flat', home,
    'forms', forms
  );
end;
$$;

create or replace function public.submit_my_form(
  form_id bigint,
  contact text,
  answers jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  enquiry public.enquiries%rowtype;
  actor public.profiles%rowtype;
  home text;
  member_name text;
  digits text;
  field public.enquiry_fields%rowtype;
  raw text;
  kept jsonb := '[]'::jsonb;
  saved_id bigint;
  existed boolean := false;
  item jsonb;
begin
  perform public.phone_require('forms', 'manage');
  select * into enquiry from public.enquiries where id = form_id;
  if not found then
    raise exception 'This form is not available.';
  end if;
  if enquiry.closed_at is not null then
    raise exception 'This form is closed.';
  end if;
  if enquiry.visibility = 'private' and public.phone_access('forms') = 'none' then
    raise exception 'Sign in as a community member to send this.';
  end if;

  select * into actor from public.profiles where user_id = auth.uid();
  if actor.flat_id is null then
    raise exception 'Link a home to this account before sending a form.';
  end if;
  select flat_number into home from public.flats where id = actor.flat_id;
  if home is null then
    raise exception 'Link a home to this account before sending a form.';
  end if;
  member_name := coalesce(nullif(trim(actor.display_name), ''), nullif(auth.jwt() ->> 'email', ''), 'A member');
  if char_length(member_name) < 2 then
    raise exception 'Enter your name.';
  end if;

  digits := regexp_replace(coalesce(contact, ''), '\D', '', 'g');
  if length(digits) = 12 and left(digits, 2) = '91' then
    digits := substring(digits from 3);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    digits := substring(digits from 2);
  end if;
  if digits !~ '^\d{10}$' then
    raise exception 'Enter a valid 10-digit phone number.';
  end if;

  for field in
    select * from public.enquiry_fields
    where enquiry_id = form_id
    order by sort_order, id
  loop
    raw := null;
    select item ->> 'value' into raw
    from jsonb_array_elements(coalesce(answers, '[]'::jsonb)) item
    where (item ->> 'fieldId') ~ '^[0-9]+$'
      and (item ->> 'fieldId')::bigint = field.id
    limit 1;
    raw := trim(coalesce(raw, ''));
    if field.kind = 'date' then
      if raw <> '' and raw !~ '^\d{4}-\d{2}-\d{2}$' then
        raw := '';
      end if;
    elsif field.kind = 'choice' then
      if raw <> '' and not (raw = any(coalesce(field.choices, '{}'))) then
        raw := '';
      end if;
    elsif field.kind = 'long' then
      raw := left(raw, 4000);
    else
      raw := left(raw, 500);
    end if;
    if field.required and raw = '' then
      raise exception 'Fill in %.', field.label;
    end if;
    if raw <> '' then
      kept := kept || jsonb_build_array(jsonb_build_object('fieldId', field.id, 'value', raw));
    end if;
  end loop;

  select id into saved_id
  from public.enquiry_responses
  where enquiry_id = form_id and flat_number = home;
  if saved_id is not null then
    existed := true;
    update public.enquiry_responses
    set name = left(member_name, 80),
        phone = digits,
        user_id = auth.uid(),
        updated_at = now()
    where id = saved_id;
    delete from public.enquiry_answers answer where answer.response_id = saved_id;
  else
    insert into public.enquiry_responses (enquiry_id, flat_number, user_id, name, phone)
    values (form_id, home, auth.uid(), left(member_name, 80), digits)
    returning id into saved_id;
  end if;

  for item in select jsonb_array_elements(kept) loop
    insert into public.enquiry_answers (response_id, field_id, value)
    values (saved_id, (item ->> 'fieldId')::bigint, item ->> 'value');
  end loop;

  if existed then
    return 'updated';
  end if;
  return 'sent';
end;
$$;

revoke all on function public.phone_access(text) from public, anon, authenticated;
revoke all on function public.phone_require(text, text) from public, anon, authenticated;
revoke all on function public.phone_can_see(text) from public, anon, authenticated;
revoke all on function public.phone_kind_label(text) from public, anon, authenticated;
revoke all on function public.phone_publish(text, text, text, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.phone_post_json(bigint, boolean) from public, anon, authenticated;

revoke all on function public.community_board() from public, anon;
grant execute on function public.community_board() to authenticated;

revoke all on function public.post_thread(bigint) from public, anon;
grant execute on function public.post_thread(bigint) to authenticated;

revoke all on function public.create_my_post(text, text, date, text[], boolean) from public, anon;
grant execute on function public.create_my_post(text, text, date, text[], boolean) to authenticated;

revoke all on function public.edit_my_post(bigint, text, date) from public, anon;
grant execute on function public.edit_my_post(bigint, text, date) to authenticated;

revoke all on function public.delete_my_post(bigint) from public, anon;
grant execute on function public.delete_my_post(bigint) to authenticated;

revoke all on function public.attach_my_post_photo(bigint, text) from public, anon;
grant execute on function public.attach_my_post_photo(bigint, text) to authenticated;

revoke all on function public.reply_to_post(bigint, text) from public, anon;
grant execute on function public.reply_to_post(bigint, text) to authenticated;

revoke all on function public.delete_my_reply(bigint) from public, anon;
grant execute on function public.delete_my_reply(bigint) to authenticated;

revoke all on function public.react_to_post(bigint, text) from public, anon;
grant execute on function public.react_to_post(bigint, text) to authenticated;

revoke all on function public.rsvp_my_event(bigint) from public, anon;
grant execute on function public.rsvp_my_event(bigint) to authenticated;

revoke all on function public.vote_my_poll(bigint, bigint) from public, anon;
grant execute on function public.vote_my_poll(bigint, bigint) to authenticated;

revoke all on function public.close_my_poll(bigint) from public, anon;
grant execute on function public.close_my_poll(bigint) to authenticated;

revoke all on function public.report_my_post(bigint, text) from public, anon;
grant execute on function public.report_my_post(bigint, text) to authenticated;

revoke all on function public.list_my_forms() from public, anon;
grant execute on function public.list_my_forms() to authenticated;

revoke all on function public.submit_my_form(bigint, text, jsonb) from public, anon;
grant execute on function public.submit_my_form(bigint, text, jsonb) to authenticated;
