-- Step 1: users and profile photos.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.users (
  id               text primary key,   -- Lichess user id (lowercase username)
  lichess_username text not null,      -- Lichess username, original capitalisation
  display_name     text not null check (char_length(display_name) between 1 and 40),
  photo_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Only our server (using the secret key) reads or writes this table.
-- Row Level Security with no policies blocks every other key.
alter table public.users enable row level security;
grant select, insert, update, delete on public.users to service_role;

-- Public bucket for profile photos: anyone can view a photo by its URL,
-- only our server can upload. JPEG only, max 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;
