
CREATE OR REPLACE FUNCTION public.get_preorder_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.preorders;
$$;
