-- 1. Drop public profiles policy (anonymous access)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. Drop overly-permissive messages SELECT policy; conversation-scoped one remains
DROP POLICY IF EXISTS "Messages are viewable by authenticated users" ON public.messages;

-- 3. Length limits
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 4000);
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 2 AND 50);

-- 4. Scope chat-media INSERT policy to user's own folder
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (cmd='INSERT')
      AND qual IS NULL
      AND policyname ILIKE '%chat%media%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;

CREATE POLICY "Users can upload to own chat-media folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
