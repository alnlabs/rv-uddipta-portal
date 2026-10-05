-- Enquiries (forms) and their answers. Written by the service role.

create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  note text,
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  ask_signin boolean not null default false,
  results_view text not null default 'community'
    check (results_view in ('admins', 'own', 'community', 'link')),
  closed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.enquiry_fields (
  id bigint generated always as identity primary key,
  enquiry_id bigint not null references public.enquiries (id) on delete cascade,
  sort_order integer not null,
  kind text not null check (kind in ('text', 'long', 'date', 'choice')),
  label text not null,
  required boolean not null default false,
  choices text[] not null default '{}'
);

create index if not exists enquiry_fields_order_idx
  on public.enquiry_fields (enquiry_id, sort_order, id);

create table if not exists public.enquiry_responses (
  id bigint generated always as identity primary key,
  enquiry_id bigint not null references public.enquiries (id) on delete cascade,
  flat_number text not null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enquiry_id, flat_number)
);

create index if not exists enquiry_responses_enquiry_idx
  on public.enquiry_responses (enquiry_id, updated_at desc);

create table if not exists public.enquiry_answers (
  response_id bigint not null references public.enquiry_responses (id) on delete cascade,
  field_id bigint not null references public.enquiry_fields (id) on delete cascade,
  value text not null,
  primary key (response_id, field_id)
);

alter table public.enquiries enable row level security;
alter table public.enquiry_fields enable row level security;
alter table public.enquiry_responses enable row level security;
alter table public.enquiry_answers enable row level security;

revoke all on public.enquiries from public, anon, authenticated;
revoke all on public.enquiry_fields from public, anon, authenticated;
revoke all on public.enquiry_responses from public, anon, authenticated;
revoke all on public.enquiry_answers from public, anon, authenticated;
