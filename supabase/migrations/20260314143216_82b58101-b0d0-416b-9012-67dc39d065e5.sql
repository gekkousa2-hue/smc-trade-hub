
-- Create conversations table for 1-to-1 chats
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_user1_fkey FOREIGN KEY (user1_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT conversations_user2_fkey FOREIGN KEY (user2_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id),
  CONSTRAINT users_ordered CHECK (user1_id < user2_id)
);

-- Add conversation_id to messages
ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations: users can see their own conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Update messages RLS: users can only see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;

CREATE POLICY "Users can view conversation messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send conversation messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Profiles: all authenticated users can view profiles (for search)
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
  uid1 UUID;
  uid2 UUID;
BEGIN
  -- Order user IDs to match the CHECK constraint
  IF auth.uid() < other_user_id THEN
    uid1 := auth.uid();
    uid2 := other_user_id;
  ELSE
    uid1 := other_user_id;
    uid2 := auth.uid();
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conv_id FROM conversations
  WHERE user1_id = uid1 AND user2_id = uid2;

  -- Create if not exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (uid1, uid2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;
