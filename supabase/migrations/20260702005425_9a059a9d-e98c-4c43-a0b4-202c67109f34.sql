-- Live streams
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Live Stream',
  room_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams"
  ON public.live_streams FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own streams"
  ON public.live_streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update own stream"
  ON public.live_streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can delete own stream"
  ON public.live_streams FOR DELETE
  TO authenticated
  USING (auth.uid() = host_user_id);

CREATE INDEX idx_live_streams_active ON public.live_streams (is_active, started_at DESC);

-- Live chat messages for a stream
CREATE TABLE public.stream_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stream_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.stream_messages TO authenticated;
GRANT ALL ON public.stream_messages TO service_role;

ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stream chat"
  ON public.stream_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send chat"
  ON public.stream_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat"
  ON public.stream_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_stream_messages_stream ON public.stream_messages (stream_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;