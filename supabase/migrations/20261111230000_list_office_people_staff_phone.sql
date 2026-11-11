-- Phone+PIN staff use synthetic emails (10digit@owners.rvuddipta.app).
-- Surface their phone in list_office_people and treat society desk roles
-- (including security) as office so Team roles can find them.

create or replace function public.list_office_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  roles jsonb := '[]'::jsonb;
  people jsonb;
  super boolean := public.is_platform_admin();
  enabled text[] := public.enabled_office_roles();
  catalog jsonb := public.office_roles_catalog();
  item jsonb;
  society text[] := array['admin','builder','committee','facility','staff','security'];
begin
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can manage team roles.';
  end if;

  for item in select * from jsonb_array_elements(catalog)
  loop
    if (item->>'value') = any(enabled)
       and (super or (item->>'value') <> 'admin') then
      roles := roles || jsonb_build_array(item);
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.sort_rank, x.name), '[]'::jsonb)
    into people
  from (
    select
      u.id::text as user_id,
      case
        when nullif(trim(p.display_name), '') is not null
          and trim(p.display_name) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and trim(p.display_name) !~ '^\d{10}$'
          then trim(p.display_name)
        when staff_phone.phone is not null then staff_phone.phone
        when nullif(trim(p.display_name), '') is not null
          and trim(p.display_name) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then trim(p.display_name)
        when nullif(trim(u.email), '') is not null
          and split_part(trim(u.email), '@', 1) !~ '^\d+$'
          then split_part(trim(u.email), '@', 1)
        when staff_phone.phone is not null then staff_phone.phone
        else 'Signed-in person'
      end as name,
      coalesce(u.email, '') as email,
      staff_phone.phone,
      coalesce(p.role, 'visitor') as role,
      case
        when coalesce(p.role, 'visitor') = 'admin' then 'Admin'
        when coalesce(p.role, 'visitor') = 'builder' then 'Builder'
        when coalesce(p.role, 'visitor') = 'committee' then 'Committee'
        when coalesce(p.role, 'visitor') = 'facility' then 'Facility manager'
        when coalesce(p.role, 'visitor') = 'staff' then 'Service staff'
        when coalesce(p.role, 'visitor') = 'security' then 'Security'
        when coalesce(p.role, 'visitor') = 'owner' then 'Owner'
        when coalesce(p.role, 'visitor') = 'co_owner' then 'Family'
        when coalesce(p.role, 'visitor') = 'tenant' then 'Tenant'
        when exists (
          select 1 from public.person_roles pr
          where pr.user_id = u.id and pr.role in ('owner', 'co_owner', 'tenant')
        ) then 'Home member'
        when nullif(trim(u.email), '') is not null then 'Signed in · no home yet'
        else 'Visitor'
      end as role_label,
      coalesce(
        f.flat_number,
        (
          select fl.flat_number
          from public.person_roles pr
          join public.flats fl on fl.id = pr.flat_id
          where pr.user_id = u.id
            and pr.role in ('owner', 'co_owner', 'tenant')
            and pr.flat_id is not null
          order by case pr.role when 'owner' then 1 when 'co_owner' then 2 else 3 end
          limit 1
        )
      ) as flat_number,
      (
        coalesce(p.role, 'visitor') = any(society)
        or exists (
          select 1 from public.person_roles pr
          where pr.user_id = u.id
            and pr.role = any(society)
        )
      ) as office,
      coalesce((
        select jsonb_agg(pr.role order by pr.role)
        from public.person_roles pr
        where pr.user_id = u.id
      ), '[]'::jsonb) as held_roles,
      case
        when coalesce(p.role, 'visitor') = any(society)
          or exists (
            select 1 from public.person_roles pr
            where pr.user_id = u.id
              and pr.role = any(society)
          ) then 1
        when coalesce(p.role, 'visitor') in ('owner', 'co_owner', 'tenant')
          or exists (
            select 1 from public.person_roles pr
            where pr.user_id = u.id and pr.role in ('owner', 'co_owner', 'tenant')
          ) then 2
        else 3
      end as sort_rank
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.flats f on f.id = p.flat_id
    left join lateral (
      select
        case
          when lower(coalesce(u.email, '')) ~ '^\d{10}@owners\.rvuddipta\.app$'
            then split_part(lower(u.email), '@', 1)
          when coalesce(u.raw_user_meta_data->>'phone', '') ~ '\d'
            and length(regexp_replace(u.raw_user_meta_data->>'phone', '\D', '', 'g')) >= 10
            then right(regexp_replace(u.raw_user_meta_data->>'phone', '\D', '', 'g'), 10)
          else null
        end as phone
    ) staff_phone on true
    where u.id is distinct from auth.uid()
      and nullif(trim(u.email), '') is not null
      and not exists (
        select 1 from public.platform_admins pa
        where lower(pa.email) = lower(u.email)
      )
  ) x;

  return jsonb_build_object(
    'roles', roles,
    'people', people,
    'can_assign_admin', super,
    'enabled_roles', to_jsonb(enabled),
    'catalog', catalog
  );
end;
$$;

revoke all on function public.list_office_people() from public, anon;
grant execute on function public.list_office_people() to authenticated;
