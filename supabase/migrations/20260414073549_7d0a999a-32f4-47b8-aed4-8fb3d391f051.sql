
CREATE OR REPLACE FUNCTION public.validate_kb_answer_length()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF LENGTH(TRIM(NEW.answer)) < 30 THEN
    RAISE EXCEPTION 'La réponse doit contenir au moins 30 caractères (reçu: %)', LENGTH(TRIM(NEW.answer));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_kb_answer_length
BEFORE INSERT OR UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.validate_kb_answer_length();
