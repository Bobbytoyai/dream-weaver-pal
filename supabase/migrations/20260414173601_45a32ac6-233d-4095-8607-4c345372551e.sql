-- Migrate Mika's sessions from old auth user_id to bobby_codes.id
UPDATE child_sessions 
SET user_id = '485de5a3-76a3-41cc-b9c4-6bf207001086' 
WHERE user_id = '4340b806-3635-462d-8168-fbaf4111a555';

UPDATE session_messages 
SET user_id = '485de5a3-76a3-41cc-b9c4-6bf207001086' 
WHERE user_id = '4340b806-3635-462d-8168-fbaf4111a555';

UPDATE conversation_analyses 
SET user_id = '485de5a3-76a3-41cc-b9c4-6bf207001086' 
WHERE user_id = '4340b806-3635-462d-8168-fbaf4111a555';

UPDATE parent_alerts 
SET user_id = '485de5a3-76a3-41cc-b9c4-6bf207001086' 
WHERE user_id = '4340b806-3635-462d-8168-fbaf4111a555';