import { useEffect, useState, useRef } from "react";
import { Room, RoomEvent, RemoteTrack, RemoteParticipant, Track } from "livekit-client";
import { Loader2 } from "lucide-react";
import { getLiveKitToken } from "@/lib/liveStream";

interface Props {
  roomName: string;
  identityName: string;
  isActive: boolean; // only connect when this stream is the visible one
}

export function LiveStreamPlayer({ roomName, identityName, isActive }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "playing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    setStatus("connecting");
    setError(null);

    (async () => {
      try {
        const { token, url } = await getLiveKitToken(roomName, "viewer", identityName);
        if (cancelled) return;
        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        const attachTrack = (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
            setStatus("playing");
          } else if (track.kind === Track.Kind.Audio && audioRef.current) {
            track.attach(audioRef.current);
          }
        };

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => attachTrack(track));

        room.on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => {
          // will trigger TrackSubscribed once tracks arrive
        });

        await room.connect(url, token);

        // Attach any tracks already present
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track);
          });
        });

        if (room.remoteParticipants.size === 0) setStatus("waiting");
      } catch (e) {
        console.error("Viewer connect error", e);
        if (!cancelled) {
          setError((e as Error).message || "Ulanib bo'lmadi");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [roomName, identityName, isActive]);

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />
      <audio ref={audioRef} autoPlay />
      {(status === "connecting" || status === "waiting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">
            {status === "connecting" ? "Efirga ulanmoqda..." : "Streamer kutilmoqda..."}
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white p-6 text-center">
          <p className="text-sm text-red-400">Efirga ulanib bo'lmadi</p>
          <p className="text-[11px] text-white/60">{error}</p>
        </div>
      )}
    </div>
  );
}
