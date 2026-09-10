-- ============================================================================
-- Nursing Shift App — Phase 1 database schema
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
--
-- What this sets up:
--   1. `profiles`  — one row per user, auto-created on sign up.
--   2. `shifts`    — empty table, ready for the Phase 2 shift-scheduling
--                     feature. Nothing in Phase 1 writes to it; it exists
--                     now so the app's authorization model doesn't have to
--                     change later.
--   3. Row Level Security (RLS) on both tables so that, at the DATABASE
--      layer (not just hidden in the frontend), every user can only ever
--      see or modify their own rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row whenever a new user signs up, so the
-- app never has to (and the frontend never needs an insert policy for
-- this table). Runs with the privileges of its owner (security definer),
-- which is required to write into `public.profiles` on behalf of a new
-- auth user during signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. shifts (Phase 2 readiness — no UI writes to this in Phase 1)
-- ----------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shift_date date not null,
  shift_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists shifts_user_id_idx on public.shifts (user_id);

alter table public.shifts enable row level security;

drop policy if exists "Users can view their own shifts" on public.shifts;
create policy "Users can view their own shifts"
  on public.shifts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own shifts" on public.shifts;
create policy "Users can insert their own shifts"
  on public.shifts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own shifts" on public.shifts;
create policy "Users can update their own shifts"
  on public.shifts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own shifts" on public.shifts;
create policy "Users can delete their own shifts"
  on public.shifts for delete
  using (auth.uid() = user_id);
