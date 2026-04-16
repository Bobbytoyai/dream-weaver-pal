
CREATE TABLE public.preorders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  extra_cases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT ''
);

ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a preorder (public form)
CREATE POLICY "Anyone can create a preorder"
ON public.preorders
FOR INSERT
WITH CHECK (true);

-- No one can read preorders from the client (admin only via service role)
CREATE POLICY "No public read access"
ON public.preorders
FOR SELECT
USING (false);

CREATE UNIQUE INDEX idx_preorders_email ON public.preorders (email);
