
-- ============================================================
-- 1. KNOWLEDGE_BASE — restrict authenticated write access
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated can update knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated can delete knowledge_base" ON public.knowledge_base;

CREATE POLICY "Auth insert own store KB"
ON public.knowledge_base FOR INSERT TO authenticated
WITH CHECK (
  source_content_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.installed_content ic
    WHERE ic.content_id = source_content_id
    AND ic.user_id = auth.uid()
  )
);

CREATE POLICY "Auth update own store KB"
ON public.knowledge_base FOR UPDATE TO authenticated
USING (
  source_content_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.installed_content ic
    WHERE ic.content_id = source_content_id
    AND ic.user_id = auth.uid()
  )
);

CREATE POLICY "Auth delete own store KB"
ON public.knowledge_base FOR DELETE TO authenticated
USING (
  source_content_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.installed_content ic
    WHERE ic.content_id = source_content_id
    AND ic.user_id = auth.uid()
  )
);

-- ============================================================
-- 2. STORE_CONTENT — remove authenticated write, keep read
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert store content" ON public.store_content;
DROP POLICY IF EXISTS "Authenticated can update store content" ON public.store_content;
DROP POLICY IF EXISTS "Authenticated can delete store content" ON public.store_content;

-- Keep update for install_count increments from contentInstaller
CREATE POLICY "Auth can update store content"
ON public.store_content FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 3. CONTENT_DATA — remove authenticated write access
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert content data" ON public.content_data;
DROP POLICY IF EXISTS "Authenticated can update content data" ON public.content_data;
DROP POLICY IF EXISTS "Authenticated can delete content data" ON public.content_data;

-- ============================================================
-- 4. CHILD_SESSIONS — tighten anon policies
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can update own sessions" ON public.child_sessions;

CREATE POLICY "Anon can read own sessions"
ON public.child_sessions FOR SELECT TO anon
USING (user_id IS NOT NULL);

CREATE POLICY "Anon can update own sessions"
ON public.child_sessions FOR UPDATE TO anon
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);

-- ============================================================
-- 5. SESSION_MESSAGES — tighten anon policies
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can delete own messages" ON public.session_messages;

CREATE POLICY "Anon can read messages via session"
ON public.session_messages FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.child_sessions cs
    WHERE cs.id = session_id
  )
);

CREATE POLICY "Anon can delete from empty sessions"
ON public.session_messages FOR DELETE TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.child_sessions cs
    WHERE cs.id = session_id
    AND cs.message_count = 0
  )
);

-- ============================================================
-- 6. CONVERSATION_ANALYSES — tighten anon read
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own analyses" ON public.conversation_analyses;

CREATE POLICY "Anon can read analyses via session"
ON public.conversation_analyses FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.child_sessions cs
    WHERE cs.id = session_id
  )
);

-- ============================================================
-- 7. PARENT_ALERTS — tighten anon access
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anon can update own alerts" ON public.parent_alerts;

CREATE POLICY "Anon can read own alerts"
ON public.parent_alerts FOR SELECT TO anon
USING (user_id IS NOT NULL);

CREATE POLICY "Anon can update own alerts"
ON public.parent_alerts FOR UPDATE TO anon
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);

-- ============================================================
-- 8. BOBBY_CODES — restrict update to unclaimed only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can claim unclaimed codes" ON public.bobby_codes;

CREATE POLICY "Claim unclaimed codes only"
ON public.bobby_codes FOR UPDATE TO public
USING (claimed_at IS NULL)
WITH CHECK (true);
