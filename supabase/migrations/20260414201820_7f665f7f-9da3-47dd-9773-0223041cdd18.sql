
-- Function: Create a session (verifies bobby_code_id exists)
CREATE OR REPLACE FUNCTION public.create_child_session(
  p_user_id UUID,
  p_child_name TEXT,
  p_child_age INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Verify the user_id corresponds to a valid bobby_code
  IF NOT EXISTS (SELECT 1 FROM bobby_codes WHERE id = p_user_id) THEN
    -- Also allow authenticated users
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
      RAISE EXCEPTION 'Invalid user_id: not a valid device or authenticated user';
    END IF;
  END IF;

  INSERT INTO child_sessions (user_id, child_name, child_age)
  VALUES (p_user_id, p_child_name, p_child_age)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function: Add a message to a session
CREATE OR REPLACE FUNCTION public.add_session_message(
  p_session_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_detected_emotion TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Verify the session belongs to the user
  IF NOT EXISTS (SELECT 1 FROM child_sessions WHERE id = p_session_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Session not found or does not belong to this user';
  END IF;

  INSERT INTO session_messages (session_id, user_id, role, content, detected_emotion)
  VALUES (p_session_id, p_user_id, p_role, p_content, p_detected_emotion)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function: End a session
CREATE OR REPLACE FUNCTION public.end_child_session(
  p_session_id UUID,
  p_user_id UUID,
  p_duration_seconds INT,
  p_detected_emotions TEXT[] DEFAULT '{}',
  p_topics TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE child_sessions
  SET ended_at = now(),
      duration_seconds = p_duration_seconds,
      detected_emotions = p_detected_emotions,
      topics = p_topics
  WHERE id = p_session_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function: Delete a short/empty session
CREATE OR REPLACE FUNCTION public.delete_empty_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only delete sessions with few messages
  DELETE FROM session_messages WHERE session_id = p_session_id;
  DELETE FROM child_sessions WHERE id = p_session_id AND user_id = p_user_id AND message_count <= 3;
  
  RETURN FOUND;
END;
$$;
