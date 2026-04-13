
-- Add cover image URL column to store_content
ALTER TABLE public.store_content
ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';

-- Create storage bucket for store cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-covers', 'store-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to store covers
CREATE POLICY "Store covers are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store-covers');

-- Allow anyone to upload store covers (admin-only in practice via app logic)
CREATE POLICY "Anyone can upload store covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'store-covers');

CREATE POLICY "Anyone can update store covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'store-covers');

CREATE POLICY "Anyone can delete store covers"
ON storage.objects
FOR DELETE
USING (bucket_id = 'store-covers');
