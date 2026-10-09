alter table public.profiles
  add column if not exists on_duty boolean not null default false;

insert into public.amenities (name, hours_note)
values
  ('Walking & jogging track', 'Daylight hours'),
  ('Meditation zone', 'Morning and evening')
on conflict (name) do nothing;
