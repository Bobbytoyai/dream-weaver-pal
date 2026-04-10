-- Allow deleting sessions
CREATE POLICY "Allow all delete on child_sessions"
ON public.child_sessions
FOR DELETE
USING (true);

-- Allow deleting session messages
CREATE POLICY "Allow all delete on session_messages"
ON public.session_messages
FOR DELETE
USING (true);