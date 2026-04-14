
ALTER TABLE public.child_memories
ADD COLUMN IF NOT EXISTS persistent_facts jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.child_memories
ADD COLUMN IF NOT EXISTS interest_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
