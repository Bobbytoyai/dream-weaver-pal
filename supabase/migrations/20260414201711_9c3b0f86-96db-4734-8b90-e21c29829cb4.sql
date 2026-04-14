
CREATE OR REPLACE FUNCTION public.update_bobby_child_name(
  p_bobby_code TEXT,
  p_child_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bobby_codes
  SET child_name = p_child_name
  WHERE code = p_bobby_code;
  
  RETURN FOUND;
END;
$$;
