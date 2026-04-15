
-- Add online/last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Add message status, reply, pin, edited to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' NOT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Create index for fast message loading
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

-- Create index for unread count
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages (conversation_id, status) WHERE status != 'read';

-- Enable realtime for messages table (for typing indicators etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create a typing_indicators table for presence
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in their conversations"
ON public.typing_indicators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = typing_indicators.conversation_id
  AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
));

CREATE POLICY "Users can upsert own typing"
ON public.typing_indicators FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing"
ON public.typing_indicators FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own typing"
ON public.typing_indicators FOR DELETE TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
