
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'général',
  priority INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  age_min INTEGER NOT NULL DEFAULT 3,
  age_max INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read knowledge_base" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Anyone can insert knowledge_base" ON public.knowledge_base FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update knowledge_base" ON public.knowledge_base FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete knowledge_base" ON public.knowledge_base FOR DELETE USING (true);

CREATE INDEX idx_knowledge_base_keywords ON public.knowledge_base USING GIN(keywords);
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base (category);
CREATE INDEX idx_knowledge_base_active ON public.knowledge_base (is_active) WHERE is_active = true;
