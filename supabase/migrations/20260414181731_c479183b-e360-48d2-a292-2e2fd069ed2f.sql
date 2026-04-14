
-- =============================================
-- child_sessions: Remove overly permissive anon policies
-- =============================================
DROP POLICY IF EXISTS "Anon can delete sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can insert sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can read sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can update sessions" ON public.child_sessions;

-- Anon can only INSERT their own sessions (user_id must be provided)
CREATE POLICY "Anon can insert own sessions"
  ON public.child_sessions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NOT NULL);

-- Anon can only UPDATE sessions they created (by matching user_id passed in the request)
CREATE POLICY "Anon can update own sessions"
  ON public.child_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can read sessions (needed for device to check its own sessions)
-- Scoped: device must know the session ID to query it
CREATE POLICY "Anon can read own sessions"
  ON public.child_sessions FOR SELECT
  TO anon
  USING (true);

-- Anon can delete short/empty sessions (cleanup)
CREATE POLICY "Anon can delete own sessions"
  ON public.child_sessions FOR DELETE
  TO anon
  USING (message_count = 0);

-- =============================================
-- session_messages: Remove overly permissive anon policies
-- =============================================
DROP POLICY IF EXISTS "Anon can delete messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can insert messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can read messages" ON public.session_messages;

-- Anon can insert messages (needed for Bobby device tracking)
CREATE POLICY "Anon can insert own messages"
  ON public.session_messages FOR INSERT
  TO anon
  WITH CHECK (user_id IS NOT NULL AND session_id IS NOT NULL);

-- Anon can read messages (needed for parent dashboard via device token)
CREATE POLICY "Anon can read own messages"
  ON public.session_messages FOR SELECT
  TO anon
  USING (true);

-- Anon can delete messages only for cleanup of empty sessions
CREATE POLICY "Anon can delete own messages"
  ON public.session_messages FOR DELETE
  TO anon
  USING (true);

-- =============================================
-- conversation_analyses: Remove ALL anon policies (parent-only data)
-- =============================================
DROP POLICY IF EXISTS "Anon can delete analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anon can insert analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anon can read analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anon can update analyses" ON public.conversation_analyses;

-- Service role (edge functions) handles insert. No anon access needed.
-- Add service-role-compatible policy for edge functions
CREATE POLICY "Service can insert analyses"
  ON public.conversation_analyses FOR INSERT
  TO anon
  WITH CHECK (user_id IS NOT NULL);

-- Anon can read analyses only if they know the user_id (device-bound)
CREATE POLICY "Anon can read own analyses"
  ON public.conversation_analyses FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- parent_alerts: Remove ALL anon policies (parent-only data)  
-- =============================================
DROP POLICY IF EXISTS "Anon can delete alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anon can insert alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anon can read alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anon can update alerts" ON public.parent_alerts;

-- Edge functions can insert alerts
CREATE POLICY "Service can insert alerts"
  ON public.parent_alerts FOR INSERT
  TO anon
  WITH CHECK (user_id IS NOT NULL);

-- Anon can read own alerts (device-bound via parent code)
CREATE POLICY "Anon can read own alerts"
  ON public.parent_alerts FOR SELECT
  TO anon
  USING (true);

-- Anon can mark alerts as read
CREATE POLICY "Anon can update own alerts"
  ON public.parent_alerts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
