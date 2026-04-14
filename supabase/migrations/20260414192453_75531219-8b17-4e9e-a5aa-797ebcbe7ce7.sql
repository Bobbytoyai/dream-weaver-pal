
CREATE OR REPLACE FUNCTION public.increment_session_message_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE child_sessions
  SET message_count = message_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_message_count
AFTER INSERT ON public.session_messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_session_message_count();
