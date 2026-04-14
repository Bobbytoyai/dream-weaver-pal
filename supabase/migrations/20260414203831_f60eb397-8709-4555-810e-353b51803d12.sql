
CREATE OR REPLACE FUNCTION public.create_bobby_device()
RETURNS TABLE(bobby_code TEXT, parent_code TEXT, bobby_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bobby_code TEXT;
  v_parent_code TEXT;
  v_bobby_id UUID;
  v_seg1 TEXT;
  v_seg2 TEXT;
BEGIN
  -- Generate unique bobby code
  LOOP
    v_seg1 := '';
    v_seg2 := '';
    FOR i IN 1..4 LOOP
      v_seg1 := v_seg1 || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
      v_seg2 := v_seg2 || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    v_bobby_code := 'BOBBY-' || v_seg1 || '-' || v_seg2;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bobby_codes bc WHERE bc.code = v_bobby_code);
  END LOOP;

  -- Generate unique parent code
  LOOP
    v_seg1 := '';
    v_seg2 := '';
    FOR i IN 1..4 LOOP
      v_seg1 := v_seg1 || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
      v_seg2 := v_seg2 || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    v_parent_code := 'PARENT-' || v_seg1 || '-' || v_seg2;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bobby_parent_codes bpc WHERE bpc.code = v_parent_code);
  END LOOP;

  -- Insert bobby code
  INSERT INTO bobby_codes (code) VALUES (v_bobby_code) RETURNING id INTO v_bobby_id;

  -- Insert parent code linked to bobby
  INSERT INTO bobby_parent_codes (code, bobby_code_id) VALUES (v_parent_code, v_bobby_id);

  RETURN QUERY SELECT v_bobby_code, v_parent_code, v_bobby_id;
END;
$$;
