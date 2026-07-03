import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { fetchStoryGroups, type StoryGroup } from "@/lib/social";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { CreateStory } from "./CreateStory";
import { StoryViewer } from "./StoryViewer";

interface Props {
  onViewProfile?: (userId: string) => void;
}

export function StoriesBar({ onViewProfile }: Props) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = async () => {
    try {
      const g = await fetchStoryGroups();
      setGroups(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    load();
    const ch = supabase
      .channel("stories-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ownGroup = userId ? groups.find((g) => g.user_id === userId) : null;
  const otherGroups = userId ? groups.filter((g) => g.user_id !== userId) : groups;

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-start gap-3 px-3 py-3 min-w-max">
          {/* Own story slot */}
          {userId && (
            <button
              onClick={() => (ownGroup ? setViewerIndex(groups.indexOf(ownGroup)) : setShowCreate(true))}
              className="flex flex-col items-center gap-1.5 w-16"
            >
              <div className="relative">
                {ownGroup ? (
                  <div className="rounded-full p-[2px] bg-gradient-to-tr from-primary via-primary/70 to-primary/40">
                    <div className="rounded-full p-[2px] bg-black">
                      <UserAvatar
                        userId={ownGroup.user_id}
                        username={ownGroup.username}
                        avatarUrl={ownGroup.avatar_url}
                        size="md"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-black/40 backdrop-blur">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-black">
                  <Plus className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                </span>
              </div>
              <span className="text-[10px] text-white/80 font-medium truncate w-16 text-center">
                {ownGroup ? "Sizniki" : "Qo'shish"}
              </span>
            </button>
          )}

          {loading && !groups.length ? (
            <div className="h-14 flex items-center px-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : (
            otherGroups.map((g) => {
              const idx = groups.indexOf(g);
              return (
                <button
                  key={g.user_id}
                  onClick={() => setViewerIndex(idx)}
                  className="flex flex-col items-center gap-1.5 w-16"
                >
                  <div className="rounded-full p-[2px] bg-gradient-to-tr from-red-500 via-pink-500 to-primary">
                    <div className="rounded-full p-[2px] bg-black">
                      <UserAvatar
                        userId={g.user_id}
                        username={g.username}
                        avatarUrl={g.avatar_url}
                        size="md"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-white/80 font-medium truncate w-16 text-center">
                    {g.username}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {showCreate && (
        <CreateStory
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer
          groups={groups}
          startIndex={viewerIndex}
          currentUserId={userId}
          onClose={() => setViewerIndex(null)}
          onDeleted={() => { setViewerIndex(null); load(); }}
          onViewProfile={onViewProfile}
        />
      )}
    </>
  );
}
