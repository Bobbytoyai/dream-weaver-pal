
-- =============================================
-- FIX 1: Remove dangerous public/anon policies on conversation-audio
-- =============================================
DROP POLICY IF EXISTS "Anyone can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete audio" ON storage.objects;

-- =============================================
-- FIX 2: Remove dangerous public write policies on store-covers
-- =============================================
DROP POLICY IF EXISTS "Anyone can upload store covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update store covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete store covers" ON storage.objects;

-- =============================================
-- FIX 3: Restrict pack_reviews SELECT to own reviews only
-- =============================================
DROP POLICY IF EXISTS "Anyone authenticated can read reviews" ON public.pack_reviews;
CREATE POLICY "Users can read own reviews"
  ON public.pack_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Also allow public read of aggregate ratings via store_content (no child_name exposed)

-- =============================================
-- FIX 4: Tighten bobby_codes UPDATE WITH CHECK
-- =============================================
DROP POLICY IF EXISTS "Claim unclaimed codes only" ON public.bobby_codes;
CREATE POLICY "Claim unclaimed codes only"
  ON public.bobby_codes FOR UPDATE
  TO public
  USING (claimed_at IS NULL)
  WITH CHECK (claimed_at IS NOT NULL AND child_name IS NOT NULL);

-- =============================================
-- FIX 5: Tighten bobby_parent_codes UPDATE WITH CHECK
-- =============================================
DROP POLICY IF EXISTS "Claim unclaimed parent codes only" ON public.bobby_parent_codes;
CREATE POLICY "Claim unclaimed parent codes only"
  ON public.bobby_parent_codes FOR UPDATE
  TO public
  USING (claimed_at IS NULL)
  WITH CHECK (claimed_at IS NOT NULL AND is_active = true);
