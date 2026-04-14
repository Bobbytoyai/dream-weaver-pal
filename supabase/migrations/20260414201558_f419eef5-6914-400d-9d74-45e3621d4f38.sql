
-- ══════════════════════════════════════════════════════════════
-- 1. CHILD_SESSIONS: Remove overly permissive anon policies
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anon can read own sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can update own sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can insert own sessions" ON public.child_sessions;
DROP POLICY IF EXISTS "Anon can delete own sessions" ON public.child_sessions;

-- ══════════════════════════════════════════════════════════════
-- 2. PARENT_ALERTS: Remove anon access, keep authenticated only
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anon can read own alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Anon can update own alerts" ON public.parent_alerts;
DROP POLICY IF EXISTS "Service can insert alerts" ON public.parent_alerts;

-- ══════════════════════════════════════════════════════════════
-- 3. CONVERSATION_ANALYSES: Remove overly permissive anon access
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anon can read analyses via session" ON public.conversation_analyses;
DROP POLICY IF EXISTS "Service can insert analyses" ON public.conversation_analyses;

-- ══════════════════════════════════════════════════════════════
-- 4. SESSION_MESSAGES: Remove anon read access
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anon can read messages via session" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can insert own messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can delete from empty sessions" ON public.session_messages;

-- ══════════════════════════════════════════════════════════════
-- 5. BOBBY_CODES: Restrict update to unclaimed or owned codes
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated can update bobby_codes" ON public.bobby_codes;
DROP POLICY IF EXISTS "Claim unclaimed codes only" ON public.bobby_codes;

-- Only allow updating unclaimed codes (for activation)
CREATE POLICY "Claim unclaimed codes only"
  ON public.bobby_codes
  FOR UPDATE
  TO public
  USING (claimed_at IS NULL)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- 6. STORE_CONTENT: Remove public update, restrict to service role
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Auth can update store content" ON public.store_content;

-- ══════════════════════════════════════════════════════════════
-- 7. STORY_TEMPLATES: Remove public write access
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can insert story templates" ON public.story_templates;
DROP POLICY IF EXISTS "Anyone can update story templates" ON public.story_templates;

-- ══════════════════════════════════════════════════════════════
-- 8. BOBBY_PARENT_CODES: Fix hijack vulnerability
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can claim unclaimed parent codes" ON public.bobby_parent_codes;

CREATE POLICY "Claim unclaimed parent codes only"
  ON public.bobby_parent_codes
  FOR UPDATE
  TO public
  USING (claimed_at IS NULL)
  WITH CHECK (is_active = true);

-- ══════════════════════════════════════════════════════════════
-- 9. STORAGE: Secure conversation-audio bucket
-- ══════════════════════════════════════════════════════════════

-- Remove overly permissive storage policies for conversation-audio
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read for conversation audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload for conversation audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update for conversation audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete for conversation audio" ON storage.objects;

-- Only authenticated users can manage their own audio
CREATE POLICY "Auth users upload own audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'conversation-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users read own audio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'conversation-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users delete own audio"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'conversation-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ══════════════════════════════════════════════════════════════
-- 10. STORAGE: Secure store-covers bucket (read-only public)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Allow public upload for store covers" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update for store covers" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete for store covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can insert store covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can update store covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete store covers" ON storage.objects;

-- ══════════════════════════════════════════════════════════════
-- 11. Create a security definer function for session_data updates
--     (bobby_codes needs updating for parent settings)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_bobby_session_data(
  p_bobby_code TEXT,
  p_session_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bobby_codes
  SET session_data = p_session_data
  WHERE code = p_bobby_code;
  
  RETURN FOUND;
END;
$$;
