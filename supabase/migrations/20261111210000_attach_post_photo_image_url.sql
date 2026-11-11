-- Fix: parameter name image_url collided with member_posts.image_url
-- ("column reference image_url is ambiguous"), so photo attach failed and
-- mobile deleted the new post ("The post was not kept.").

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
  photo_url text := attach_my_post_photo.image_url;
begin
  select * into post from public.member_posts where id = target;
  if not found then
    raise exception 'That post is gone.';
  end if;
  if post.author_user_id <> auth.uid() then
    raise exception 'You can add a photo to your own post.';
  end if;
  if post.kind not in ('sale', 'lost', 'event', 'recommendation', 'wanted', 'giveaway', 'parking', 'celebration', 'emergency', 'alert') then
    raise exception 'This type does not take a photo.';
  end if;
  feature := case
    when post.kind in ('event', 'celebration') then 'events'
    else 'feed'
  end;
  perform public.phone_require(feature, 'manage');
  object_name := substring(photo_url from '/post-photos/(posts/[0-9]+/[0-9]+\.(jpg|jpeg|png|webp))$');
  if object_name is null or object_name not like 'posts/' || target::text || '/%' then
    raise exception 'That photo is not saved.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'post-photos' and name = object_name
  ) then
    raise exception 'That photo is not saved.';
  end if;
  update public.member_posts
  set image_url = photo_url
  where id = target;
end;
$$;

revoke all on function public.attach_my_post_photo(bigint, text) from public, anon;
grant execute on function public.attach_my_post_photo(bigint, text) to authenticated;
