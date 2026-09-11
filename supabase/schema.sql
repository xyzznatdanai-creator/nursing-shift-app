-- ============================================================================
-- Nursing Shift App — database schema (Phase 1 + V1.1 + V1.2 Personal Planning)
-- ============================================================================
-- Safe to run this whole file again any time — every statement is
-- idempotent (create ... if not exists / drop policy if exists), so
-- re-running it to pick up new columns or policies never touches existing
-- data.
--
-- Run it in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
--
-- What this sets up:
--   1. `profiles`    — one row per user, auto-created on sign up.
--   2. `shifts`      — each row is one shift a user entered: date, shift
--                       type, start/end time, optional notes. `shift_type`
--                       is a plain text value (not a fixed enum), so adding
--                       a new shift type later is just adding an entry to
--                       SHIFT_TYPES in the frontend — no migration needed.
--   3. `activities`  — each row is one personal activity a user entered:
--                       date, title, start/end time, optional notes. Shown
--                       alongside that day's shifts so a user can plan
--                       around their work schedule.
--   4. Row Level Security (RLS) on every table so that, at the DATABASE
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
-- 2. shifts
-- ----------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shift_date date not null,
  shift_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Added in V1.1: start/end time of the shift. Stored as plain `time`
-- (wall-clock, Asia/Bangkok — the app never lets a user pick a
-- timezone), separate from `shift_date`. An overnight shift (e.g.
-- 22:00 → 08:00) is represented exactly as entered: end_time is simply
-- "earlier" than start_time, which the app treats as "ends the next
-- day" rather than as invalid input.
alter table public.shifts add column if not exists start_time time not null default '08:00';
alter table public.shifts add column if not exists end_time time not null default '16:00';
alter table public.shifts alter column start_time drop default;
alter table public.shifts alter column end_time drop default;

create index if not exists shifts_user_id_idx on public.shifts (user_id);
create index if not exists shifts_user_id_shift_date_idx on public.shifts (user_id, shift_date);

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

-- ----------------------------------------------------------------------------
-- 3. activities (V1.2 — Personal Planning)
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  title text not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists activities_user_id_idx on public.activities (user_id);
create index if not exists activities_user_id_activity_date_idx on public.activities (user_id, activity_date);

alter table public.activities enable row level security;

drop policy if exists "Users can view their own activities" on public.activities;
create policy "Users can view their own activities"
  on public.activities for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own activities" on public.activities;
create policy "Users can insert their own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own activities" on public.activities;
create policy "Users can update their own activities"
  on public.activities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own activities" on public.activities;
create policy "Users can delete their own activities"
  on public.activities for delete
  using (auth.uid() = user_id);
