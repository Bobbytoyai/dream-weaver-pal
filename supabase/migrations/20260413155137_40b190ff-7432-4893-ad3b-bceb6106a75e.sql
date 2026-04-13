
ALTER TABLE public.child_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.session_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.child_memories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.conversation_analyses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.parent_alerts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.cloud_profiles ALTER COLUMN user_id SET NOT NULL;
