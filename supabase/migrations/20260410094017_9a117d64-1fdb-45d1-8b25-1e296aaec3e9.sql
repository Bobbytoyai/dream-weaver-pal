
-- Add new columns to story_templates
ALTER TABLE public.story_templates 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Aventure',
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS mood text,
ADD COLUMN IF NOT EXISTS full_text text,
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_story_templates_category ON public.story_templates(category);

-- Allow anyone to update story_templates (for favorites)
CREATE POLICY "Anyone can update story templates"
ON public.story_templates
FOR UPDATE
USING (true);

-- Allow anyone to insert story templates
CREATE POLICY "Anyone can insert story templates"
ON public.story_templates
FOR INSERT
WITH CHECK (true);
