
-- Add anon RLS policies for child_sessions (so Bobby LCD without auth can create sessions)
CREATE POLICY "Anon can insert sessions" ON public.child_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read sessions" ON public.child_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update sessions" ON public.child_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete sessions" ON public.child_sessions FOR DELETE TO anon USING (true);

-- Add anon RLS policies for session_messages
CREATE POLICY "Anon can insert messages" ON public.session_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read messages" ON public.session_messages FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can delete messages" ON public.session_messages FOR DELETE TO anon USING (true);

-- Add anon RLS policies for conversation_analyses
CREATE POLICY "Anon can insert analyses" ON public.conversation_analyses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read analyses" ON public.conversation_analyses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update analyses" ON public.conversation_analyses FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete analyses" ON public.conversation_analyses FOR DELETE TO anon USING (true);

-- Add anon RLS policies for parent_alerts
CREATE POLICY "Anon can insert alerts" ON public.parent_alerts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read alerts" ON public.parent_alerts FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update alerts" ON public.parent_alerts FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete alerts" ON public.parent_alerts FOR DELETE TO anon USING (true);
