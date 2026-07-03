-- Per-user stream likes table so likes require auth and are unique per user
CREATE TABLE IF NOT EXISTS public.stream_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.stream_likes TO authenticated;
GRANT ALL ON public.stream_likes TO service_role;

ALTER TABLE public.stream_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view likes"
  ON public.stream_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.stream_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own like"
  ON public.stream_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Keep live_streams.like_count in sync
CREATE OR REPLACE FUNCTION public.sync_stream_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET like_count = like_count + 1 WHERE id = NEW.stream_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_streams SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.stream_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_stream_likes_count ON public.stream_likes;
CREATE TRIGGER trg_stream_likes_count
AFTER INSERT OR DELETE ON public.stream_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_stream_like_count();

-- Ensure live_streams INSERT policy scopes host to auth user (defense in depth)
DROP POLICY IF EXISTS "Users can start their own streams" ON public.live_streams;
CREATE POLICY "Users can start their own streams"
  ON public.live_streams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_user_id);