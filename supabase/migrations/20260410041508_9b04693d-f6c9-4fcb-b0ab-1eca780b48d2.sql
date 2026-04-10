
-- Sessions table
CREATE TABLE public.child_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER NOT NULL DEFAULT 0,
  detected_emotions TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session messages table
CREATE TABLE public.session_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.child_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  detected_emotion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth required for toy usage)
CREATE POLICY "Allow all read on child_sessions" ON public.child_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on child_sessions" ON public.child_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on child_sessions" ON public.child_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow all read on session_messages" ON public.session_messages FOR SELECT USING (true);
CREATE POLICY "Allow all insert on session_messages" ON public.session_messages FOR INSERT WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_session_messages_session_id ON public.session_messages(session_id);
CREATE INDEX idx_child_sessions_child_name ON public.child_sessions(child_name);
CREATE INDEX idx_child_sessions_started_at ON public.child_sessions(started_at DESC);
