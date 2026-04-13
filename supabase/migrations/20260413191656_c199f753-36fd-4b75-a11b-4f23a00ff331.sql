
-- Table for parent-mode QR codes (one per Bobby, separate from activation QR)
CREATE TABLE public.bobby_parent_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  bobby_code_id UUID NOT NULL REFERENCES public.bobby_codes(id) ON DELETE CASCADE,
  device_token TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_bobby_parent_codes_code ON public.bobby_parent_codes(code);
CREATE INDEX idx_bobby_parent_codes_bobby_code_id ON public.bobby_parent_codes(bobby_code_id);

-- Enable RLS
ALTER TABLE public.bobby_parent_codes ENABLE ROW LEVEL SECURITY;

-- Allow reading codes (to verify validity)
CREATE POLICY "Anyone can read parent codes"
ON public.bobby_parent_codes
FOR SELECT
USING (true);

-- Allow claiming unclaimed codes (update device_token + claimed_at)
CREATE POLICY "Anyone can claim unclaimed parent codes"
ON public.bobby_parent_codes
FOR UPDATE
USING (claimed_at IS NULL OR device_token IS NOT NULL)
WITH CHECK (is_active = true);
