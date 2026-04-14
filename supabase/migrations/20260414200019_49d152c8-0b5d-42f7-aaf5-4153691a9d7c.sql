
-- Allow authenticated users to update bobby_codes (for session_data changes like parent settings)
CREATE POLICY "Authenticated can update bobby_codes"
  ON public.bobby_codes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
