import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Heart, Users, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveStreams, incrementViewer, toggleLikeStream, fetchLikedStreamIds, type LiveStream } from "@/lib/liveStream";
import { LiveStreamPlayer } from "@/components/live/LiveStreamPlayer";
import { LiveChat } from "@/components/live/LiveChat";
import { UserAvatar } from "@/components/UserAvatar";
import { StoriesBar } from "@/components/stories/StoriesBar";



interface Props {
  onViewProfile?: (userId: string) => void;
}

export default function LiveFeedPage({ onViewProfile }: Props) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerCountedRef = useRef<Set<string>>(new Set());

  const loadStreams = useCallback(async () => {
    try {
      const list = await fetchActiveStreams();
      setStreams(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreams();
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", u.id)
        .single();
      setUser({ id: u.id, username: p?.username || "User", avatar_url: p?.avatar_url || null });
    })();

    const channel = supabase
      .channel("live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        loadStreams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadStreams]);

  // Snap-scroll: detect current index
  const handleScroll = () => {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (idx !== currentIndex && idx >= 0 && idx < streams.length) {
      setCurrentIndex(idx);
    }
  };

  // Count viewer when landing on a stream
  useEffect(() => {
    const s = streams[currentIndex];
    if (!s) return;
    if (viewerCountedRef.current.has(s.id)) return;
    viewerCountedRef.current.add(s.id);
    incrementViewer(s.id, 1);
    return () => {
      // decrement when leaving stream/page
      incrementViewer(s.id, -1);
      viewerCountedRef.current.delete(s.id);
    };
  }, [currentIndex, streams]);

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Load which streams the current user has liked
  useEffect(() => {
    if (!user || streams.length === 0) return;
    fetchLikedStreamIds(streams.map((s) => s.id)).then(setLikedIds).catch(() => {});
  }, [user, streams]);

  const handleLike = async (streamId: string) => {
    if (!user) {
      toast.error("Like bosish uchun tizimga kiring");
      return;
    }
    try {
      const result = await toggleLikeStream(streamId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (result === "liked") next.add(streamId); else next.delete(streamId);
        return next;
      });
    } catch (e) {
      const msg = (e as Error).message === "AUTH_REQUIRED"
        ? "Like bosish uchun tizimga kiring"
        : "Like saqlanmadi";
      toast.error(msg);
    }
  };

  const handleGoLive = () => {
    if (!user) {
      toast.error("Efirga chiqish uchun tizimga kiring");
      return;
    }
    setShowGoLive(true);
  };

  if (showGoLive && user) {
    return (
      <GoLive
        onClose={() => { setShowGoLive(false); loadStreams(); }}
        currentUserId={user.id}
        currentUsername={user.username}
      />
    );
  }


  return (
    <div className="fixed inset-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-black overflow-hidden">
      {/* Stories bar */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/85 via-black/70 to-transparent">
        <StoriesBar onViewProfile={onViewProfile} />
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : streams.length === 0 ? (
        <EmptyState onGoLive={handleGoLive} isAuthed={!!user} />
      ) : (

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {streams.map((s, idx) => (
            <div key={s.id} className="relative h-full w-full snap-start snap-always overflow-hidden">
              <LiveStreamPlayer
                roomName={s.room_name}
                identityName={user?.username || "Viewer"}
                isActive={idx === currentIndex}
              />

              {/* gradient overlays */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

              {/* Top: LIVE badge + viewers */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
                <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 shadow-[0_0_16px_rgba(239,68,68,0.6)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
                </div>
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-white text-xs">
                  <Users className="h-3 w-3" /> {s.viewer_count}
                </div>
              </div>

              {/* Bottom: streamer info + title */}
              <div className="absolute bottom-0 left-0 right-16 z-10 p-4 space-y-2">
                <button
                  onClick={() => onViewProfile?.(s.host_user_id)}
                  className="flex items-center gap-2.5 group"
                >
                  <UserAvatar
                    userId={s.host_user_id}
                    username={s.host_profile?.username || "User"}
                    avatarUrl={s.host_profile?.avatar_url}
                    size="sm"
                    ring
                  />
                  <div className="text-left">
                    <div className="text-sm font-bold text-white drop-shadow-lg group-hover:text-primary transition-colors">
                      {s.host_profile?.username || "User"}
                    </div>
                    <div className="text-[10px] text-white/70">Efirda</div>
                  </div>
                </button>
                <p className="text-white text-sm font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] line-clamp-2">
                  {s.title}
                </p>
              </div>

              {/* Right rail: like + chat toggle */}
              <div className="absolute right-3 bottom-24 z-10 flex flex-col gap-4 items-center">
                <button
                  onClick={() => handleLike(s.id)}
                  className="flex flex-col items-center gap-1 group"
                  aria-label={likedIds.has(s.id) ? "Like olib tashlash" : "Like bosish"}
                >
                  <div className={`h-11 w-11 rounded-full backdrop-blur flex items-center justify-center border transition-all group-active:scale-90 ${likedIds.has(s.id) ? "bg-red-500/20 border-red-400/50" : "bg-black/40 border-white/10"}`}>
                    <Heart className={`h-5 w-5 transition-all ${likedIds.has(s.id) ? "text-red-400 fill-red-400" : "text-red-400"}`} />
                  </div>
                  <span className="text-[10px] text-white font-semibold drop-shadow">{s.like_count}</span>
                </button>

                <button
                  onClick={() => setShowChat(true)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="h-11 w-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/10 group-active:scale-90 transition-transform">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] text-white font-semibold drop-shadow">Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Go Live button */}
      {!showChat && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={handleGoLive}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 font-bold text-xs shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.6)]"
        >
          {user ? <Radio className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
          {user ? "Efirga chiqish" : "Kirish"}
        </motion.button>
      )}


      {/* Chat overlay */}
      <AnimatePresence>
        {showChat && streams[currentIndex] && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-1/2 z-30 bg-black/85 backdrop-blur-xl rounded-t-3xl border-t border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">Jonli chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/70 text-xs px-3 py-1 rounded-full bg-white/10"
              >
                Yopish
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <LiveChat streamId={streams[currentIndex].id} currentUserId={user?.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onGoLive, isAuthed }: { onGoLive: () => void; isAuthed: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-4">
      <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center">
        <Radio className="h-9 w-9 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Hozircha efir yo'q</h2>
        <p className="text-sm text-white/60 mt-1 max-w-xs">
          {isAuthed
            ? "Birinchi bo'lib jonli efirga chiqing va treyderlar bilan bo'lishing"
            : "Efirga chiqish va like bosish uchun tizimga kiring"}
        </p>
      </div>
      <button
        onClick={onGoLive}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-3 font-bold text-sm shadow-[0_10px_40px_-10px_rgba(239,68,68,0.6)]"
      >
        {isAuthed ? <><Radio className="h-4 w-4" /> Efirni boshlash</> : <><LogIn className="h-4 w-4" /> Kirish</>}
      </button>
    </div>
  );
}

