-- Bobby Cloud — Row Level Security policies
-- Parents see only their own profile, their children, their sessions, their events.
-- Edge Functions (service_role) bypass RLS.

-- Enable RLS on every table
alter table public.profiles      enable row level security;
alter table public.children      enable row level security;
alter table public.devices       enable row level security;
alter table public.sessions      enable row level security;
alter table public.events        enable row level security;
alter table public.limits        enable row level security;
alter table public.content_packs enable row level security;
alter table public.pack_unlocks  enable row level security;

-- ─── profiles : self only ─────────────────────────────────────
create policy "self_select_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "self_update_profile" on public.profiles
  for update using (auth.uid() = id);

-- ─── children : parent owns ───────────────────────────────────
create policy "parent_select_children" on public.children
  for select using (auth.uid() = parent_id);

create policy "parent_insert_children" on public.children
  for insert with check (auth.uid() = parent_id);

create policy "parent_update_children" on public.children
  for update using (auth.uid() = parent_id);

create policy "parent_delete_children" on public.children
  for delete using (auth.uid() = parent_id);

-- ─── devices : parent of the child ────────────────────────────
create policy "parent_select_devices" on public.devices
  for select using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_insert_devices" on public.devices
  for insert with check (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_update_devices" on public.devices
  for update using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_delete_devices" on public.devices
  for delete using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

-- ─── sessions : parent read-only ──────────────────────────────
create policy "parent_select_sessions" on public.sessions
  for select using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

-- (sessions are written by Edge Functions via service_role, bypasses RLS)

-- ─── events : parent read-only ────────────────────────────────
create policy "parent_select_events" on public.events
  for select using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

-- ─── limits : parent full CRUD ────────────────────────────────
create policy "parent_select_limits" on public.limits
  for select using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_upsert_limits" on public.limits
  for insert with check (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_update_limits" on public.limits
  for update using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

-- ─── content_packs : public catalog (everyone reads) ──────────
create policy "public_select_packs" on public.content_packs
  for select using (true);

-- ─── pack_unlocks : parent manages for their kids ─────────────
create policy "parent_select_unlocks" on public.pack_unlocks
  for select using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_insert_unlocks" on public.pack_unlocks
  for insert with check (
    child_id in (select id from public.children where parent_id = auth.uid())
  );

create policy "parent_delete_unlocks" on public.pack_unlocks
  for delete using (
    child_id in (select id from public.children where parent_id = auth.uid())
  );
