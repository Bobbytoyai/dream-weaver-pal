-- Add behavioral scores and interests to conversation_analyses
ALTER TABLE public.conversation_analyses 
  ADD COLUMN IF NOT EXISTS sociability_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS curiosity_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emotional_stability_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extracted_interests text[] DEFAULT '{}'::text[];

-- Add session tags
ALTER TABLE public.child_sessions
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Add privacy mode to child_memories
ALTER TABLE public.child_memories
  ADD COLUMN IF NOT EXISTS privacy_mode boolean DEFAULT false;

-- Create index for tag filtering
CREATE INDEX IF NOT EXISTS idx_child_sessions_tags ON public.child_sessions USING GIN(tags);
