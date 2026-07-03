
-- 1. Restrict avatar bucket policies to authenticated users
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual LIKE '%avatars%' OR with_check LIKE '%avatars%')
      AND (cmd IN ('INSERT','UPDATE'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2 & 3. Conversations UPDATE and DELETE policies
CREATE POLICY "Participants can update their conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants can delete their conversations"
ON public.conversations FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 4. Realtime.messages RLS — restrict channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can subscribe to permitted topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- Personal global channel: global-<uid>
  (realtime.topic() = 'global-' || auth.uid()::text)
  OR
  -- Conversation-scoped channels: messages-<convId>, typing-<convId>
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (realtime.topic() = 'messages-' || c.id::text
        OR realtime.topic() = 'typing-' || c.id::text)
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
  OR
  -- Live stream channels are public by design
  realtime.topic() LIKE 'live-%'
  OR realtime.topic() LIKE 'stream-%'
);
