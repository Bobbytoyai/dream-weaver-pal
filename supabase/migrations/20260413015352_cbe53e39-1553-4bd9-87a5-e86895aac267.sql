
-- Table for Bobby Cloud sync profiles
CREATE TABLE public.cloud_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_code TEXT NOT NULL UNIQUE,
  child_name TEXT NOT NULL,
  parent_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  child_memory_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_info TEXT DEFAULT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cloud_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read cloud profiles"
  ON public.cloud_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create cloud profiles"
  ON public.cloud_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cloud profiles"
  ON public.cloud_profiles FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete cloud profiles"
  ON public.cloud_profiles FOR DELETE
  USING (true);

-- Index for fast sync code lookup
CREATE INDEX idx_cloud_profiles_sync_code ON public.cloud_profiles (sync_code);
CREATE INDEX idx_cloud_profiles_child_name ON public.cloud_profiles (child_name);
