
DROP POLICY IF EXISTS "Stories authed read" ON storage.objects;
CREATE POLICY "Stories authed read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Stories owner insert" ON storage.objects;
CREATE POLICY "Stories owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Stories owner delete" ON storage.objects;
CREATE POLICY "Stories owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'stories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
