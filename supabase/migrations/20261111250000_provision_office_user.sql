-- Create / update society desk accounts (phone + PIN) from the mobile app via RPC.
-- No website/Vercel API required. Login email is {phone}@owners.rvuddipta.app.

create or replace function public.provision_office_user(
  staff_phone text,
  staff_pin text,
  next_role text,
  display_name text default '',
  contact_email text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  actor uuid := auth.uid();
  super boolean := public.is_platform_admin();
  enabled text[] := public.enabled_office_roles();
  phone text;
  pin text;
  login_email text;
  shown_name text;
  label text;
  target uuid;
  created boolean := false;
  instance uuid;
  meta jsonb;
  contact text;
begin
  if actor is null then
    raise exception 'Sign in first.';
  end if;
  if not (super or public.is_society_admin()) then
    raise exception 'Only admin can create staff.';
  end if;

  phone := nullif(regexp_replace(coalesce(staff_phone, ''), '\D', '', 'g'), '');
  if phone is null then
    raise exception 'Enter a valid 10-digit phone number.';
  end if;
  if length(phone) = 12 and left(phone, 2) = '91' then
    phone := right(phone, 10);
  elsif length(phone) = 11 and left(phone, 1) = '0' then
    phone := right(phone, 10);
  end if;
  if phone !~ '^\d{10}$' then
    raise exception 'Enter a valid 10-digit phone number.';
  end if;

  pin := regexp_replace(coalesce(staff_pin, ''), '\D', '', 'g');
  if pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits.';
  end if;

  next_role := nullif(trim(coalesce(next_role, '')), '');
  if next_role is null or not (next_role = any(enabled)) then
    raise exception 'Pick a society role type (security, facility, staff, and so on).';
  end if;
  if next_role = 'admin' and not super then
    raise exception 'Only a super admin can create a society admin.';
  end if;
  if not super and next_role not in ('builder', 'committee', 'facility', 'staff', 'security') then
    raise exception 'Only a super admin can assign society admin.';
  end if;

  contact := nullif(lower(trim(coalesce(contact_email, ''))), '');
  if contact is not null and contact !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address, or leave it blank.';
  end if;
  if contact is not null and exists (
    select 1 from public.platform_admins pa
    where lower(pa.email) = contact
  ) then
    raise exception 'That email is reserved for platform admin.';
  end if;

  label := case next_role
    when 'admin' then 'Admin'
    when 'builder' then 'Builder'
    when 'committee' then 'Committee'
    when 'facility' then 'Facility manager'
    when 'staff' then 'Service staff'
    when 'security' then 'Security'
    else next_role
  end;
  shown_name := coalesce(nullif(trim(display_name), ''), label || ' ' || right(phone, 4));
  login_email := phone || '@owners.rvuddipta.app';
  meta := jsonb_build_object(
    'phone', phone,
    'full_name', shown_name,
    'name', shown_name
  );
  if contact is not null then
    meta := meta || jsonb_build_object('contact_email', contact);
  end if;

  select id into target
  from auth.users
  where lower(email) = lower(login_email)
  limit 1;

  if target is null then
    select coalesce(
      (select u.instance_id from auth.users u where u.instance_id is not null limit 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    ) into instance;

    target := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      instance,
      target,
      'authenticated',
      'authenticated',
      login_email,
      crypt(pin, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      meta,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      target,
      jsonb_build_object('sub', target::text, 'email', login_email, 'email_verified', true, 'phone', phone),
      'email',
      target::text,
      now(),
      now(),
      now()
    );
    created := true;
  else
    if target = actor then
      raise exception 'You cannot change your own role here.';
    end if;
    if exists (
      select 1 from public.platform_admins pa
      join auth.users u on lower(u.email) = lower(pa.email)
      where u.id = target
    ) then
      raise exception 'A super admin account cannot be changed here.';
    end if;
    if exists (
      select 1 from public.profiles p
      where p.user_id = target and p.role = 'admin' and not super
    ) then
      raise exception 'Only a super admin can change a society admin.';
    end if;

    update auth.users
    set encrypted_password = crypt(pin, gen_salt('bf')),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || meta,
        updated_at = now(),
        email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = target;
  end if;

  if target = actor then
    raise exception 'You cannot change your own role here.';
  end if;

  perform public.assign_office_role(target, next_role, shown_name);

  return jsonb_build_object(
    'ok', true,
    'created', created,
    'userId', target,
    'phone', phone,
    'email', contact,
    'role', next_role,
    'roleLabel', label,
    'message', case
      when created then label || ' created (' || phone || '). They sign in with phone + PIN.'
      else label || ' updated (' || phone || '). They sign in with phone + PIN.'
    end
  );
end;
$$;

revoke all on function public.provision_office_user(text, text, text, text, text) from public, anon;
grant execute on function public.provision_office_user(text, text, text, text, text) to authenticated;
