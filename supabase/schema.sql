-- ============================================================================
-- Nursing Shift App — database schema
-- (Phase 1 + V1.1 Shift + V1.2 Personal Planning + V1.3 Smart Schedule +
--  V1.4 Reminder & Notification)
-- ============================================================================
-- V1.3 added no schema changes (pure computation over existing tables).
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
--   4. `notification_settings` — one row per user: whether shift/activity
--                       reminders are on, and how many minutes before each
--                       one fires.
--   5. `push_subscriptions` — one row per browser/device that has enabled
--                       push notifications for that user.
--   6. `notification_log`   — history of reminders actually sent; also
--                       used to prevent sending the same reminder twice.
--   7. Row Level Security (RLS) on every table so that, at the DATABASE
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

-- ----------------------------------------------------------------------------
-- 4. notification_settings (V1.4 — Reminder & Notification)
-- ----------------------------------------------------------------------------
-- One row per user. Created lazily (upserted) the first time a user opens
-- Settings → การแจ้งเตือน, with the same defaults shown there: shift
-- reminder 60 minutes before, activity reminder 30 minutes before, both on.
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shift_reminder_enabled boolean not null default true,
  shift_reminder_minutes integer not null default 60,
  activity_reminder_enabled boolean not null default true,
  activity_reminder_minutes integer not null default 30,
  conflict_notification_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists "Users can view their own notification settings" on public.notification_settings;
create policy "Users can view their own notification settings"
  on public.notification_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notification settings" on public.notification_settings;
create policy "Users can insert their own notification settings"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notification settings" on public.notification_settings;
create policy "Users can update their own notification settings"
  on public.notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. push_subscriptions (V1.4)
-- ----------------------------------------------------------------------------
-- One row per browser/device the user has enabled notifications on (a
-- Web Push subscription). `endpoint` is unique per browser installation,
-- so re-subscribing the same device safely replaces its old row instead
-- of piling up duplicates.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. notification_log (V1.4)
-- ----------------------------------------------------------------------------
-- Records every reminder actually sent — doubles as (a) the "ประวัติการ
-- แจ้งเตือน" history list shown in Settings, and (b) the de-duplication
-- guard: the background job that sends reminders inserts a row here
-- *before* sending, using a `dedup_key` that encodes which shift/activity,
-- its current start time, and which reminder threshold this is. The
-- `unique (user_id, dedup_key)` constraint means that if the background
-- job runs again before the next threshold, or runs twice for the same
-- moment, the second insert simply fails and no duplicate push is sent.
-- Editing a shift/activity's time changes its dedup_key (because the time
-- is part of the key), so an edited item is naturally eligible for a
-- fresh reminder; a deleted one is never queried again, so its reminder
-- is never sent.
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dedup_key text not null,
  kind text not null, -- 'shift' | 'activity' | 'conflict'
  title text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, dedup_key)
);

create index if not exists notification_log_user_id_sent_at_idx
  on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;

-- Read-only from the frontend on purpose: rows are written only by the
-- trusted background job (using the service-role key, which bypasses RLS
-- entirely), never by a logged-in user's own browser. A user can see
-- their own notification history but can't insert/forge or delete it.
drop policy if exists "Users can view their own notification log" on public.notification_log;
create policy "Users can view their own notification log"
  on public.notification_log for select
  using (auth.uid() = user_id);
