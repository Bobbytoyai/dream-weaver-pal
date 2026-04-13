
-- Add user_id to sensitive tables
ALTER TABLE public.child_memories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.child_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.session_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.parent_alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cloud_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_memories_user_id ON public.child_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_child_sessions_user_id ON public.child_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_user_id ON public.session_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analyses_user_id ON public.conversation_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_user_id ON public.parent_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_profiles_user_id ON public.cloud_profiles(user_id);

-- ═══════════════════════════════════════════════════════
-- child_memories: Drop old policies, create scoped ones
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can create child memories" ON public.child_memories;
DROP POLICY IF EXISTS "Anyone can read child memories" ON public.child_memories;
DROP POLICY IF EXISTS "Anyone can update child memories" ON public.child_memories;

CREATE POLICY "Users can read own child memories"
  ON public.child_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own child memories"
  ON public.child_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own child memories"
  ON public.child_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own child memories"
  ON public.child_memories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- child_sessions
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all delete on child_sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Allow all insert on child_sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Allow all read on child_sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Allow all update on child_sessions" ON public.child_sessions;

CREATE POLICY "Users can read own sessions"
  ON public.child_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.child_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.child_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.child_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- session_messages
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all delete on session_messages" ON public.session_messages;
DROP POLICY IF EXISTS "Allow all insert on session_messages" ON public.session_messages;
DROP POLICY IF EXISTS "Allow all read on session_messages" ON public.session_messages;

CREATE POLICY "Users can read own messages"
  ON public.session_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON public.session_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.session_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- conversation_analyses
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can delete analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anyone can insert analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anyone can read analyses" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Anyone can update analyses" ON public.conversation_analyses;

CREATE POLICY "Users can read own analyses"
  ON public.conversation_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
  ON public.conversation_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.conversation_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.conversation_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- parent_alerts
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can insert parent alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anyone can read parent alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anyone can update parent alerts" ON public.parent_alerts;

CREATE POLICY "Users can read own alerts"
  ON public.parent_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.parent_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.parent_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.parent_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- cloud_profiles
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can create cloud profiles" ON public.cloud_profiles;
DROP POLICY IF EXISTS "Anyone can delete cloud profiles" ON public.cloud_profiles;
DROP POLICY IF EXISTS "Anyone can read cloud profiles" ON public.cloud_profiles;
DROP POLICY IF EXISTS "Anyone can update cloud profiles" ON public.cloud_profiles;

CREATE POLICY "Users can read own cloud profiles"
  ON public.cloud_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cloud profiles"
  ON public.cloud_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cloud profiles"
  ON public.cloud_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cloud profiles"
  ON public.cloud_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- Tighten public content tables: read-only for public, write for authenticated only
-- ═══════════════════════════════════════════════════════

-- knowledge_base: keep public read, restrict writes
DROP POLICY IF EXISTS "Anyone can delete knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Anyone can insert knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Anyone can update knowledge_base" ON public.knowledge_base;

CREATE POLICY "Authenticated can insert knowledge_base"
  ON public.knowledge_base FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update knowledge_base"
  ON public.knowledge_base FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete knowledge_base"
  ON public.knowledge_base FOR DELETE TO authenticated USING (true);

-- store_content: keep public read, restrict writes
DROP POLICY IF EXISTS "Anyone can delete store content" ON public.store_content;
DROP POLICY IF EXISTS "Anyone can insert store content" ON public.store_content;
DROP POLICY IF EXISTS "Anyone can update store content" ON public.store_content;

CREATE POLICY "Authenticated can insert store content"
  ON public.store_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update store content"
  ON public.store_content FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete store content"
  ON public.store_content FOR DELETE TO authenticated USING (true);

-- content_data: keep public read, restrict writes
DROP POLICY IF EXISTS "Anyone can delete content data" ON public.content_data;
DROP POLICY IF EXISTS "Anyone can insert content data" ON public.content_data;
DROP POLICY IF EXISTS "Anyone can update content data" ON public.content_data;

CREATE POLICY "Authenticated can insert content data"
  ON public.content_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update content data"
  ON public.content_data FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete content data"
  ON public.content_data FOR DELETE TO authenticated USING (true);

-- installed_content: scope to authenticated
DROP POLICY IF EXISTS "Anyone can install content" ON public.installed_content;
DROP POLICY IF EXISTS "Anyone can read installed content" ON public.installed_content;
DROP POLICY IF EXISTS "Anyone can uninstall content" ON public.installed_content;
DROP POLICY IF EXISTS "Anyone can update installed content" ON public.installed_content;

CREATE POLICY "Authenticated can read installed content"
  ON public.installed_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can install content"
  ON public.installed_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update installed content"
  ON public.installed_content FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can uninstall content"
  ON public.installed_content FOR DELETE TO authenticated USING (true);
