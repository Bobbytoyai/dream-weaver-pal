-- Table for unique Bobby QR codes
CREATE TABLE public.bobby_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  claimed_at timestamptz,
  child_name text,
  child_age integer,
  session_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bobby_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code exists and read it
CREATE POLICY "Anyone can read bobby codes"
ON public.bobby_codes FOR SELECT
TO public
USING (true);

-- Anyone can claim an unclaimed code (update)
CREATE POLICY "Anyone can claim unclaimed codes"
ON public.bobby_codes FOR UPDATE
TO public
USING (claimed_at IS NULL)
WITH CHECK (true);