-- Story templates table
CREATE TABLE public.story_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  age_min INTEGER NOT NULL DEFAULT 5,
  age_max INTEGER NOT NULL DEFAULT 12,
  duration TEXT NOT NULL DEFAULT 'medium',
  template_text TEXT NOT NULL,
  interactive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read story templates"
ON public.story_templates FOR SELECT
TO public
USING (true);

-- Child memories table for persistent preferences
CREATE TABLE public.child_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_name TEXT NOT NULL UNIQUE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  favorite_themes TEXT[] NOT NULL DEFAULT '{}'::text[],
  last_story_id UUID REFERENCES public.story_templates(id),
  total_stories_heard INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.child_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read child memories"
ON public.child_memories FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can create child memories"
ON public.child_memories FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update child memories"
ON public.child_memories FOR UPDATE
TO public
USING (true);

-- Index for fast lookups
CREATE INDEX idx_story_templates_theme ON public.story_templates(theme);
CREATE INDEX idx_child_memories_name ON public.child_memories(child_name);