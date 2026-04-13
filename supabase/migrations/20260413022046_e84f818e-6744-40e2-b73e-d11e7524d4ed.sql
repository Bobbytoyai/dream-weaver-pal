
-- Add detailed product fields to store_content for App Store-style product pages
ALTER TABLE public.store_content
  ADD COLUMN IF NOT EXISTS detailed_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS creator_name TEXT NOT NULL DEFAULT 'Équipe Bobby',
  ADD COLUMN IF NOT EXISTS creator_role TEXT NOT NULL DEFAULT 'Éducation & Divertissement',
  ADD COLUMN IF NOT EXISTS version_label TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS changelog TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS screenshots TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skills_developed TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS duration_estimate TEXT NOT NULL DEFAULT '10-15 min',
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'adaptatif',
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{fr}'::text[],
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;
