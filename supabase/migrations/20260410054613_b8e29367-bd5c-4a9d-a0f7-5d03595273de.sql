
-- Storage bucket for conversation audio
INSERT INTO storage.buckets (id, name, public) VALUES ('conversation-audio', 'conversation-audio', false);

-- RLS policies for the storage bucket
CREATE POLICY "Anyone can upload audio" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'conversation-audio');
CREATE POLICY "Anyone can read audio" ON storage.objects FOR SELECT TO public USING (bucket_id = 'conversation-audio');
CREATE POLICY "Anyone can delete audio" ON storage.objects FOR DELETE TO public USING (bucket_id = 'conversation-audio');

-- Conversation analyses table
CREATE TABLE public.conversation_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.child_sessions(id) ON DELETE CASCADE,
  audio_path TEXT,
  full_transcription TEXT,
  summary TEXT,
  emotions JSONB NOT NULL DEFAULT '{}',
  topics_detected TEXT[] NOT NULL DEFAULT '{}',
  behavior_insights TEXT[] NOT NULL DEFAULT '{}',
  engagement_level TEXT NOT NULL DEFAULT 'medium',
  attention_span TEXT,
  interaction_frequency TEXT,
  mood_score TEXT DEFAULT 'neutral',
  alerts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analyses" ON public.conversation_analyses FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert analyses" ON public.conversation_analyses FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update analyses" ON public.conversation_analyses FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete analyses" ON public.conversation_analyses FOR DELETE TO public USING (true);
