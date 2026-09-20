-- Owner data is members-only. Anon cannot read the board.

revoke all on public.flats_public from public, anon, authenticated;
grant select on public.flats_public to authenticated;

revoke all on function public.request_owner_login(text) from public, anon, authenticated;

create or replace function public.is_approved_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.flats where user_id = auth.uid()
  );
$$;

revoke all on function public.is_approved_owner() from public, anon;
grant execute on function public.is_approved_owner() to authenticated;

drop policy if exists approved_owners_read_board on public.flats;
create policy approved_owners_read_board
on public.flats
for select
to authenticated
using (public.is_approved_owner());

-- View now obeys the caller’s RLS, so pending accounts see nothing.
create or replace view public.flats_public
with (security_invoker = true) as
select
  id,
  flat_number,
  floor,
  unit,
  type,
  owner_name,
  case
    when phone is null or length(phone) < 4 then '****'
    else substr(phone, 1, 2) || '******' || right(phone, 2)
  end as phone_masked,
  registration,
  interior,
  ceremony,
  moving,
  updated_at
from public.flats;

grant select on public.flats_public to authenticated;

create or replace function public.lookup_login_status(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  has_flat boolean;
  req_status text;
begin
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    raise exception 'Enter a valid 10-digit phone number';
  end if;

  select exists(select 1 from public.flats where phone = normalized) into has_flat;
  if has_flat then
    return jsonb_build_object(
      'status', 'ready',
      'ok', true,
      'message', 'Enter your password to continue.',
      'phoneMasked', substr(normalized, 1, 2) || '******' || right(normalized, 2)
    );
  end if;

  select status into req_status
  from public.registration_requests
  where phone = normalized
  order by created_at desc
  limit 1;

  if req_status = 'pending' then
    return jsonb_build_object(
      'status', 'pending',
      'ok', false,
      'message', 'Your registration is waiting for admin approval.'
    );
  end if;

  if req_status = 'rejected' then
    return jsonb_build_object(
      'status', 'rejected',
      'ok', false,
      'message', 'Your registration was not approved. You can apply again.'
    );
  end if;

  return jsonb_build_object(
    'status', 'unknown',
    'ok', false,
    'message', 'No owner found for this phone. Register to request access.'
  );
end;
$$;
