-- First, clean up duplicates: keep the one with the most data (prefer ones with summary)
DELETE FROM conversation_analyses a
USING conversation_analyses b
WHERE a.session_id = b.session_id
  AND a.id <> b.id
  AND (
    (a.summary IS NULL AND b.summary IS NOT NULL)
    OR (a.summary IS NULL AND b.summary IS NULL AND a.created_at > b.created_at)
  );

-- Merge audio_path from remaining duplicates before adding constraint
-- For any remaining duplicates, keep the newest one
DELETE FROM conversation_analyses a
USING conversation_analyses b
WHERE a.session_id = b.session_id
  AND a.id <> b.id
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE conversation_analyses ADD CONSTRAINT conversation_analyses_session_id_unique UNIQUE (session_id);