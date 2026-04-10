ALTER TABLE public.child_memories
  ADD COLUMN IF NOT EXISTS progression_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS interaction_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emotional_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_emotions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS relationship_score integer NOT NULL DEFAULT 0;