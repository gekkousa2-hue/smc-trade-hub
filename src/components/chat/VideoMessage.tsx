import { useRef, useState, memo } from "react";
import { Play } from "lucide-react";

export const VideoMessage = memo(function VideoMessage({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div
      onClick={toggle}
      className="relative h-44 w-44 cursor-pointer rounded-full overflow-hidden bg-transparent shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.45),0_0_0_1px_hsl(var(--primary)/0.15)] ring-1 ring-primary/20 transition-transform active:scale-[0.98]"
      style={{ aspectRatio: "1 / 1" }}
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 h-full w-full object-cover rounded-full"
        playsInline
        loop
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/20 backdrop-blur-[1px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/60 backdrop-blur-md">
            <Play className="h-5 w-5 fill-primary text-primary" />
          </div>
        </div>
      )}
    </div>
  );
});
