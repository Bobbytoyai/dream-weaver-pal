ALTER TABLE public.child_sessions
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_note text DEFAULT null;