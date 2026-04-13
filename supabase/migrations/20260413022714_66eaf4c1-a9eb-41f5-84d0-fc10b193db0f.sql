
-- Table storing actual content data for each store pack
CREATE TABLE public.content_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.store_content(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL DEFAULT 'qa',
  question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  age_min INTEGER NOT NULL DEFAULT 3,
  age_max INTEGER NOT NULL DEFAULT 12,
  emotion TEXT NOT NULL DEFAULT 'happy',
  keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
  priority INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by content_id
CREATE INDEX idx_content_data_content_id ON public.content_data(content_id);
CREATE INDEX idx_content_data_type ON public.content_data(data_type);

-- Enable RLS
ALTER TABLE public.content_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read content data" ON public.content_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert content data" ON public.content_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update content data" ON public.content_data FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete content data" ON public.content_data FOR DELETE USING (true);

-- Add source tracking to knowledge_base for installed content
ALTER TABLE public.knowledge_base
  ADD COLUMN IF NOT EXISTS source_content_id UUID REFERENCES public.store_content(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_kb_source_content ON public.knowledge_base(source_content_id);
