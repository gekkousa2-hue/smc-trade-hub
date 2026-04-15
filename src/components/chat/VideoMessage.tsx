import { useRef, useState, memo } from "react";
import { Play } from "lucide-react";

export const VideoMessage = memo(function VideoMessage({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else videoRef.current.play();
    setPlaying(!playing);
  };
  return (
    <div className="relative w-36 h-36 rounded-full overflow-hidden cursor-pointer border-2 border-primary/40" onClick={toggle}>
      <video ref={videoRef} src={src} className="w-full h-full object-cover" playsInline loop onEnded={() => setPlaying(false)} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <Play className="h-8 w-8 text-primary drop-shadow" />
        </div>
      )}
    </div>
  );
});
