-- Drop FK constraints to auth.users so device-only bobby_codes.id can be used as user_id
ALTER TABLE child_sessions DROP CONSTRAINT child_sessions_user_id_fkey;
ALTER TABLE session_messages DROP CONSTRAINT session_messages_user_id_fkey;
ALTER TABLE conversation_analyses DROP CONSTRAINT conversation_analyses_user_id_fkey;
ALTER TABLE parent_alerts DROP CONSTRAINT parent_alerts_user_id_fkey;