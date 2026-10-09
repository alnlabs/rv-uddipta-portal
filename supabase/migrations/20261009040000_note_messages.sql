create table if not exists public.note_messages (
  id bigint generated always as identity primary key,
  note_id bigint not null references public.member_notes (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  from_office boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists note_messages_note_idx
  on public.note_messages (note_id, created_at);

insert into public.note_messages (note_id, author_user_id, author_name, from_office, body, created_at)
select id, author_user_id, author_name, false, body, created_at
from public.member_notes
where not exists (
  select 1 from public.note_messages existing
  where existing.note_id = member_notes.id and existing.from_office = false
);

insert into public.note_messages (note_id, author_user_id, author_name, from_office, body, created_at)
select id, author_user_id, 'Office', true, admin_reply, created_at
from public.member_notes
where admin_reply is not null
  and length(trim(admin_reply)) > 0
  and not exists (
    select 1 from public.note_messages existing
    where existing.note_id = member_notes.id and existing.from_office = true
  );

alter table public.note_messages enable row level security;
revoke all on public.note_messages from public, anon, authenticated;
