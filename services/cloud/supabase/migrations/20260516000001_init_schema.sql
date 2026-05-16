-- Bobby Cloud — initial schema
-- Run via : supabase db reset
--
-- Tables :
--   profiles       — parents (extends auth.users)
--   children       — kid profiles
--   devices        — Watcher devices linked to children
--   sessions       — conversation sessions
--   events         — safety / system events
--   limits         — per-child usage limits
--   content_packs  — Bobby Store content (50+ packs)
--   pack_unlocks   — which packs are unlocked per child

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── profiles (1-1 with auth.users) ──────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  name         text,
  role         text not null default 'parent' check (role in ('parent','admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── children ────────────────────────────────────────────────
create table public.children (
  id          uuid primary key default uuid_generate_v4(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  name        text not null,                 -- prénom seul, RGPD-min
  birth_year  int  not null,                 -- année naissance, pas date complète
  language    text not null default 'fr',
  avatar      text default 'bobby_chien',    -- chien / chat / lapin
  created_at  timestamptz not null default now()
);

create index on public.children(parent_id);

-- ─── devices (Watcher devices) ───────────────────────────────
create table public.devices (
  id            uuid primary key default uuid_generate_v4(),
  child_id      uuid not null references public.children(id) on delete cascade,
  hardware_id   text unique not null,        -- MAC address ESP32-S3
  pairing_code  text,                        -- 6-digit, used during onboarding
  last_seen_at  timestamptz,
  firmware_ver  text,
  created_at    timestamptz not null default now()
);

create index on public.devices(child_id);

-- ─── sessions ────────────────────────────────────────────────
create table public.sessions (
  id            uuid primary key default uuid_generate_v4(),
  child_id      uuid not null references public.children(id) on delete cascade,
  device_id     uuid references public.devices(id) on delete set null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_ms   int default 0,
  exchanges     int default 0,
  transcript    jsonb default '[]'::jsonb,   -- [{role:'child',text:..,t:..},{role:'bobby',text:..,t:..}]
  emotion_last  text,
  created_at    timestamptz not null default now()
);

create index on public.sessions(child_id, started_at desc);

-- ─── events (safety + system) ────────────────────────────────
create type event_type as enum ('safety','system','interaction','limit');
create type event_severity as enum ('info','vigilance','urgence');

create table public.events (
  id          uuid primary key default uuid_generate_v4(),
  child_id    uuid not null references public.children(id) on delete cascade,
  session_id  uuid references public.sessions(id) on delete set null,
  type        event_type not null,
  severity    event_severity not null default 'info',
  message     text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index on public.events(child_id, created_at desc);
create index on public.events(severity) where severity != 'info';

-- ─── limits (1-1 per child) ──────────────────────────────────
create table public.limits (
  child_id          uuid primary key references public.children(id) on delete cascade,
  daily_minutes     int  not null default 45,
  weekly_minutes    int,                       -- nullable
  blocked_topics    text[] default '{}',
  school_mode       bool not null default false,
  bedtime_start     time,                      -- ex 20:30
  bedtime_end       time,                      -- ex 07:00
  updated_at        timestamptz not null default now()
);

-- ─── content_packs (Bobby Store) ─────────────────────────────
create table public.content_packs (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  name         text not null,
  category     text not null,
  age_min      int not null,
  age_max      int not null,
  size_bytes   int,
  language     text not null default 'fr',
  is_free      bool not null default true,
  payload      jsonb not null,               -- Q&A, stories, sounds...
  created_at   timestamptz not null default now()
);

create index on public.content_packs(category, age_min, age_max);

-- ─── pack_unlocks (which packs each child has) ──────────────
create table public.pack_unlocks (
  child_id     uuid not null references public.children(id) on delete cascade,
  pack_id      uuid not null references public.content_packs(id) on delete cascade,
  unlocked_at  timestamptz not null default now(),
  primary key (child_id, pack_id)
);

-- ─── auto-update timestamps ─────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger limits_touch before update on public.limits
  for each row execute function public.touch_updated_at();

-- ─── auto-create profile on signup ──────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
