
-- Create music storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('bobby-music', 'bobby-music', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for music files
CREATE POLICY "Anyone can read music files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bobby-music');

-- Auth users can upload music
CREATE POLICY "Auth users upload music"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bobby-music');

-- Auth users can delete own music
CREATE POLICY "Auth users delete music"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bobby-music' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Music tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.store_content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Traditionnel',
  file_path TEXT, -- path in bobby-music bucket, null until MP3 uploaded
  duration_seconds INTEGER DEFAULT 0,
  trigger_phrases TEXT[] NOT NULL DEFAULT '{}', -- 5-6 ways to ask for this song
  category TEXT NOT NULL DEFAULT 'comptine',
  age_min INTEGER NOT NULL DEFAULT 3,
  age_max INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  play_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can read music tracks (needed for Bobby to match songs)
CREATE POLICY "Anyone can read music tracks"
  ON public.music_tracks FOR SELECT
  TO public
  USING (true);

-- No public write - admin only via service role

-- Function to increment play count
CREATE OR REPLACE FUNCTION public.increment_music_play(track_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE music_tracks SET play_count = play_count + 1 WHERE id = track_id;
$$;
