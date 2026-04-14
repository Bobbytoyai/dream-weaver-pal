
-- Add trust & validation columns to knowledge_base
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS learning_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS quality_score numeric NOT NULL DEFAULT 1.0;

-- Auto-learned entries start with lower trust
COMMENT ON COLUMN public.knowledge_base.trust_score IS 'Confidence score 0.0-1.0. Manual=1.0, auto-learned starts at 0.3';
COMMENT ON COLUMN public.knowledge_base.validation_status IS 'pending | validated | rejected';
COMMENT ON COLUMN public.knowledge_base.learning_source IS 'manual | auto_learned | gap_fill | conversation';

-- Index for filtering by trust in queries
CREATE INDEX IF NOT EXISTS idx_kb_trust_status ON public.knowledge_base (trust_score, validation_status) WHERE is_active = true;
