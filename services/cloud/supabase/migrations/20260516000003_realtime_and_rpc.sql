-- Bobby Cloud — Realtime channels + RPC helpers
-- Run after _init_schema + _rls_policies

-- ─── Realtime : publish sessions + events ─────────────────────
-- PWA parent subscribes to these to get live updates
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.children;

-- ─── RPC append_exchange ─────────────────────────────────────
-- Used by /voice Edge Function to append a child↔bobby exchange
-- to an ongoing session transcript (jsonb array).
-- service_role only.
create or replace function public.append_exchange(
  p_session_id uuid,
  p_child_text text,
  p_bobby_text text,
  p_emotion    text
) returns void
language plpgsql
security definer
as $$
begin
  update public.sessions
     set transcript = transcript ||
         jsonb_build_array(
           jsonb_build_object('role','child', 'text', p_child_text, 't', extract(epoch from now())*1000),
           jsonb_build_object('role','bobby', 'text', p_bobby_text, 't', extract(epoch from now())*1000)
         ),
         exchanges    = exchanges + 1,
         emotion_last = p_emotion,
         ended_at     = now(),
         duration_ms  = extract(epoch from (now() - started_at))::int * 1000
   where id = p_session_id;
end;
$$;

revoke all on function public.append_exchange from public;
grant execute on function public.append_exchange to service_role;

-- ─── RPC start_session ───────────────────────────────────────
create or replace function public.start_session(
  p_child_id  uuid,
  p_device_id uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.sessions (child_id, device_id, started_at)
  values (p_child_id, p_device_id, now())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_session from public;
grant execute on function public.start_session to service_role;

-- ─── View : daily usage per child (for limits enforcement) ───
create or replace view public.daily_usage as
  select child_id,
         current_date as day,
         coalesce(sum(duration_ms) / 60000, 0)::int as minutes_today,
         count(*)::int as sessions_today
    from public.sessions
   where started_at::date = current_date
group by child_id;

grant select on public.daily_usage to authenticated;
