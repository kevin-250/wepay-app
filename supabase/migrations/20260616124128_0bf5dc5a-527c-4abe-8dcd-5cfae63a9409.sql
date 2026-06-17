
CREATE POLICY "users read own files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wepay-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "users upload own files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wepay-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wepay-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wepay-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
