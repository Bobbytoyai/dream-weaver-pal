-- Add user_id column to installed_content
ALTER TABLE public.installed_content 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated can read installed content" ON public.installed_content;
DROP POLICY IF EXISTS "Authenticated can install content" ON public.installed_content;
DROP POLICY IF EXISTS "Authenticated can update installed content" ON public.installed_content;
DROP POLICY IF EXISTS "Authenticated can uninstall content" ON public.installed_content;

-- Create user-scoped policies
CREATE POLICY "Users can read own installed content"
ON public.installed_content FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can install own content"
ON public.installed_content FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own installed content"
ON public.installed_content FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can uninstall own content"
ON public.installed_content FOR DELETE
TO authenticated
USING (auth.uid() = user_id);