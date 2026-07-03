import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/UserAvatar";
import { deleteStory, type StoryGroup } from "@/lib/social";
import { toast } from "sonner";

interface Props {
  groups: StoryGroup[];
  startIndex: number;
  currentUserId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  onViewProfile?: (userId: string) => void;
}

const IMAGE_DURATION_MS = 5000;

export function StoryViewer({ groups, startIndex, currentUserId, onClose, onDeleted, onViewProfile }: Props) {
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedAt = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwn = currentUserId === group?.user_id;

  const advance = () => {
    if (!group) return;
    if (storyIdx + 1 < group.stories.length) {
      setStoryIdx(storyIdx + 1);
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx(groupIdx + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const back = () => {
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
    else if (groupIdx > 0) {
      const prev = groupIdx - 1;
      setGroupIdx(prev);
      setStoryIdx(groups[prev].stories.length - 1);
    }
  };

  // Progress loop
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    startedAt.current = Date.now();

    const isVideo = story.media_type === "video";
    const duration = isVideo && videoRef.current
      ? (videoRef.current.duration ? videoRef.current.duration * 1000 : IMAGE_DURATION_MS)
      : IMAGE_DURATION_MS;

    let accumulated = 0;
    let lastTs = Date.now();

    const tick = () => {
      if (paused) {
        lastTs = Date.now();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = Date.now();
      accumulated += now - lastTs;
      lastTs = now;
      const p = Math.min(1, accumulated / duration);
      setProgress(p);
      if (p >= 1) {
        advance();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, paused]);

  const handleDelete = async () => {
    if (!story) return;
    await deleteStory(story);
    toast.success("O'chirildi");
    onDeleted();
  };

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black flex items-center justify-center select-none">
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white transition-none"
                style={{ width: `${i < storyIdx ? 100 : i === storyIdx ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <button
            onClick={() => onViewProfile?.(group.user_id)}
            className="flex items-center gap-2"
          >
            <UserAvatar userId={group.user_id} username={group.username} avatarUrl={group.avatar_url} size="sm" ring />
            <span className="text-white text-sm font-semibold drop-shadow">{group.username}</span>
            <span className="text-white/60 text-[11px]">
              {timeAgo(story.created_at)}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {isOwn && (
              <button
                onClick={handleDelete}
                className="h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
                aria-label="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex items-center justify-center bg-black"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          >
            {story.media_type === "video" ? (
              <video
                ref={videoRef}
                src={story.signed_url}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                onEnded={advance}
              />
            ) : (
              <img
                src={story.signed_url}
                alt=""
                className="w-full h-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-gradient-to-t from-black/85 to-transparent">
            <p className="text-white text-sm drop-shadow">{story.caption}</p>
          </div>
        )}

        {/* Tap zones */}
        <button
          onClick={back}
          className="absolute left-0 top-16 bottom-16 w-1/3 z-10"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6 text-white/0" />
        </button>
        <button
          onClick={advance}
          className="absolute right-0 top-16 bottom-16 w-1/3 z-10"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6 text-white/0" />
        </button>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 1) return `${h}s`;
  if (m >= 1) return `${m}d`;
  return "hozir";
}
