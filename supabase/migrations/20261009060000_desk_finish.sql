alter table public.member_notes
  add column if not exists image_url text;

create unique index if not exists amenity_bookings_open_slot
  on public.amenity_bookings (amenity_id, starts_on, slot)
  where status in ('pending', 'confirmed');
