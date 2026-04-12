
-- Table catalogue du Bobby Store
CREATE TABLE public.store_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📦',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'jeux',
  age_min integer NOT NULL DEFAULT 3,
  age_max integer NOT NULL DEFAULT 12,
  tags text[] NOT NULL DEFAULT '{}',
  size_label text NOT NULL DEFAULT '1 Mo',
  is_new boolean NOT NULL DEFAULT false,
  is_popular boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  install_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour tracker quels contenus sont installés par enfant
CREATE TABLE public.installed_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_name text NOT NULL,
  content_id uuid NOT NULL REFERENCES public.store_content(id) ON DELETE CASCADE,
  installed_at timestamp with time zone NOT NULL DEFAULT now(),
  is_enabled boolean NOT NULL DEFAULT true,
  UNIQUE(child_name, content_id)
);

-- RLS
ALTER TABLE public.store_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installed_content ENABLE ROW LEVEL SECURITY;

-- Store content: tout le monde peut lire, seul admin peut modifier (pour l'instant public)
CREATE POLICY "Anyone can read store content"
  ON public.store_content FOR SELECT USING (true);

CREATE POLICY "Anyone can insert store content"
  ON public.store_content FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update store content"
  ON public.store_content FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete store content"
  ON public.store_content FOR DELETE USING (true);

-- Installed content: tout le monde peut CRUD (pas d'auth pour l'instant)
CREATE POLICY "Anyone can read installed content"
  ON public.installed_content FOR SELECT USING (true);

CREATE POLICY "Anyone can install content"
  ON public.installed_content FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update installed content"
  ON public.installed_content FOR UPDATE USING (true);

CREATE POLICY "Anyone can uninstall content"
  ON public.installed_content FOR DELETE USING (true);

-- Index pour performance
CREATE INDEX idx_store_content_category ON public.store_content(category);
CREATE INDEX idx_store_content_active ON public.store_content(is_active);
CREATE INDEX idx_installed_content_child ON public.installed_content(child_name);
