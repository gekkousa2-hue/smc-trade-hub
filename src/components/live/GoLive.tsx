import { useEffect, useRef, useState } from "react";
import { Room, LocalVideoTrack, LocalAudioTrack, createLocalTracks, VideoPresets } from "livekit-client";
import { X, Radio, Loader2, Users, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { createStream, endStream, getLiveKitToken, type LiveStream } from "@/lib/liveStream";
import { supabase } from "@/integrations/supabase/client";
import { LiveChat } from "./LiveChat";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  currentUserId: string;
  currentUsername: string;
}

export function GoLive({ onClose, currentUserId, currentUsername }: Props) {
  const [phase, setPhase] = useState<"setup" | "starting" | "live">("setup");
  const [title, setTitle] = useState("");
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const previewTracksRef = useRef<{ video?: LocalVideoTrack; audio?: LocalAudioTrack }>({});

  // Preview camera on setup
  useEffect(() => {
    if (phase !== "setup") return;
    let cancelled = false;
    (async () => {
      try {
        const tracks = await createLocalTracks({
          audio: true,
          video: { facingMode: "user", resolution: VideoPresets.h720.resolution },
        });
        if (cancelled) {
          tracks.forEach((t) => t.stop());
          return;
        }
        for (const t of tracks) {
          if (t.kind === "video") {
            previewTracksRef.current.video = t as LocalVideoTrack;
            if (videoRef.current) (t as LocalVideoTrack).attach(videoRef.current);
          } else if (t.kind === "audio") {
            previewTracksRef.current.audio = t as LocalAudioTrack;
          }
        }
      } catch (e) {
        setError("Kameraga ruxsat berilmadi: " + (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      previewTracksRef.current.video?.stop();
      previewTracksRef.current.audio?.stop();
      previewTracksRef.current = {};
    };
  }, [phase]);

  // While live, subscribe to viewer_count/like_count updates
  useEffect(() => {
    if (phase !== "live" || !stream) return;
    setViewerCount(stream.viewer_count);
    setLikeCount(stream.like_count);
    const ch = supabase
      .channel(`stream-counts-${stream.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${stream.id}` },
        (payload) => {
          const n = payload.new as any;
          setViewerCount(n.viewer_count ?? 0);
          setLikeCount(n.like_count ?? 0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [phase, stream]);

  const startLive = async () => {
    setError(null);
    setPhase("starting");
    try {
      const s = await createStream(title || `${currentUsername} efirda`);
      const { token, url } = await getLiveKitToken(s.room_name, "host", currentUsername);
      const room = new Room({ adaptiveStream: true, dynacast: true });
      await room.connect(url, token);

      const v = previewTracksRef.current.video;
      const a = previewTracksRef.current.audio;
      if (v) await room.localParticipant.publishTrack(v);
      if (a) await room.localParticipant.publishTrack(a);

      roomRef.current = room;
      setStream(s);
      setPhase("live");
      toast.success("Efir boshlandi!");
    } catch (e) {
      console.error(e);
      setError((e as Error).message || "Efir boshlanmadi");
      setPhase("setup");
    }
  };

  const stopLive = async () => {
    roomRef.current?.disconnect();
    previewTracksRef.current.video?.stop();
    previewTracksRef.current.audio?.stop();
    if (stream) await endStream(stream.id);
    toast.info("Efir tugadi");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <button
          onClick={phase === "live" ? stopLive : onClose}
          className="h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {phase === "live" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 shadow-[0_0_16px_rgba(239,68,68,0.6)]">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1 text-white text-xs">
              <Users className="h-3 w-3" /> {viewerCount}
            </div>
            <div className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1 text-white text-xs">
              <Heart className="h-3 w-3 text-red-400" /> {likeCount}
            </div>
          </div>
        )}
      </div>

      {/* Setup UI */}
      {phase !== "live" && (
        <div className="relative z-10 mt-auto p-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-3">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            placeholder="Efir sarlavhasi (masalan: XAUUSD tahlili)"
            className="w-full bg-black/60 backdrop-blur border border-white/20 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startLive}
            disabled={phase === "starting"}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(239,68,68,0.7)] disabled:opacity-60"
          >
            {phase === "starting" ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Ulanmoqda...</>
            ) : (
              <><Radio className="h-5 w-5" /> Efirni boshlash</>
            )}
          </motion.button>
        </div>
      )}

      {/* Live UI: chat panel */}
      {phase === "live" && stream && (
        <div className="relative z-10 flex-1 flex flex-col justify-end">
          <div className="max-h-[45vh] bg-gradient-to-t from-black/85 to-transparent">
            <LiveChat streamId={stream.id} currentUserId={currentUserId} />
          </div>
        </div>
      )}
    </div>
  );
}
