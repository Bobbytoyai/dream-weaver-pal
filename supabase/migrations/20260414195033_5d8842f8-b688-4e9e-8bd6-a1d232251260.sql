
-- Create pack_reviews table
CREATE TABLE public.pack_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.store_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  child_name TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pack_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can read reviews"
  ON public.pack_reviews FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create own reviews"
  ON public.pack_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.pack_reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.pack_reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Function to recalculate store_content rating after review changes
CREATE OR REPLACE FUNCTION public.update_pack_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.content_id, OLD.content_id);
  
  UPDATE store_content SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM pack_reviews WHERE content_id = target_id), 4.5),
    rating_count = (SELECT COUNT(*) FROM pack_reviews WHERE content_id = target_id)
  WHERE id = target_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers
CREATE TRIGGER trg_update_pack_rating_insert
  AFTER INSERT ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

CREATE TRIGGER trg_update_pack_rating_update
  AFTER UPDATE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();

CREATE TRIGGER trg_update_pack_rating_delete
  AFTER DELETE ON public.pack_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_pack_rating();
