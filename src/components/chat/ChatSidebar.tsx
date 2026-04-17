import { memo } from "react";
import { Search, MessagesSquare, MessageSquare, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "./ChatHelpers";
import { UserAvatar } from "@/components/UserAvatar";
import { ConversationSkeleton } from "./SkeletonLoaders";
import type { Profile, Conversation } from "@/hooks/useChatState";

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  searchResults: Profile[];
  isSearching: boolean;
  loadingConversations: boolean;
  onSearchChange: (q: string) => void;
  onOpenConversation: (userId: string) => void;
  onSelectConversation: (id: string) => void;
}

export const ChatSidebar = memo(function ChatSidebar({
  conversations, activeConversationId, searchQuery, searchResults, isSearching,
  loadingConversations, onSearchChange, onOpenConversation, onSelectConversation,
}: Props) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <MessagesSquare className="h-5 w-5 text-primary" />
        <h1 className="font-display text-lg font-bold text-foreground">Xabarlar</h1>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Treyderlarni qidirish..."
            className="w-full rounded-xl bg-secondary/80 pl-9 pr-8 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loadingConversations ? (
          <ConversationSkeleton />
        ) : isSearching ? (
          <div className="px-2 py-1">
            <p className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Natijalar</p>
            {searchResults.length === 0 && searchQuery.trim() && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Hech narsa topilmadi</p>
            )}
            {searchResults.map((profile) => (
              <button
                key={profile.user_id}
                onClick={() => onOpenConversation(profile.user_id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-secondary/80 active:scale-[0.98]"
              >
                <UserAvatar userId={profile.user_id} username={profile.username} avatarUrl={profile.avatar_url} size="md" online={profile.is_online} />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{profile.username}</p>
                  <p className="text-xs text-primary/70 font-mono">Xabar yozish →</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-2 py-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-4">
                  <MessageSquare className="h-9 w-9 text-primary/50" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground mb-1">Suhbatlar yo'q</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Suhbatni boshlash uchun yuqoridagi qidiruvdan treyderlarni toping</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 mb-1 transition-all active:scale-[0.98] ${
                    activeConversationId === conv.id
                      ? "bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_16px_-6px_hsl(var(--primary)/0.4)]"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <UserAvatar userId={conv.other_user?.user_id || ""} username={conv.other_user?.username || "?"} avatarUrl={conv.other_user?.avatar_url} size="md" online={conv.other_user?.is_online} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">{conv.other_user?.username || "Noma'lum"}</p>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {conv.last_message_at && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">{formatTime(conv.last_message_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      {conv.last_message ? (
                        <p className="text-xs text-muted-foreground truncate flex-1">{conv.last_message}</p>
                      ) : <span className="flex-1" />}
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-[0_0_10px_hsl(45_93%_58%/0.5)]">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </>
  );
});
