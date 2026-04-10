ALTER TABLE public.child_memories
  ADD COLUMN IF NOT EXISTS behavior_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS engagement_triggers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS learning_speed text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS interaction_style text NOT NULL DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS preferred_topics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_patterns jsonb NOT NULL DEFAULT '{}'::jsonb;