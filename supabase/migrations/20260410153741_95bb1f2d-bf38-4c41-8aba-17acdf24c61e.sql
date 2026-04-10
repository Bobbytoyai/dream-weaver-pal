CREATE OR REPLACE FUNCTION public.increment_kb_usage(entry_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE knowledge_base SET usage_count = usage_count + 1 WHERE id = entry_id;
$$;