
CREATE TABLE public.parent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.child_sessions(id) ON DELETE CASCADE NOT NULL,
  child_name TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'warning',
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  context TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read parent alerts" ON public.parent_alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert parent alerts" ON public.parent_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update parent alerts" ON public.parent_alerts FOR UPDATE USING (true);
