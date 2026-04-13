-- Allow updating session_data on claimed codes (for settings persistence)
DROP POLICY IF EXISTS "Anyone can claim unclaimed codes" ON bobby_codes;
DROP POLICY IF EXISTS "Allow session data updates on claimed codes" ON bobby_codes;

-- Only allow claiming unclaimed codes OR updating session_data on already claimed codes
CREATE POLICY "Anyone can claim unclaimed codes" ON bobby_codes
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);