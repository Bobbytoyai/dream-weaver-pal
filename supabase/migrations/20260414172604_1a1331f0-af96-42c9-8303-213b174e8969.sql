
CREATE POLICY "Anon can upload audio" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'conversation-audio');
CREATE POLICY "Anon can read audio" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'conversation-audio');
CREATE POLICY "Anon can update audio" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'conversation-audio');
CREATE POLICY "Anon can delete audio" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'conversation-audio');
