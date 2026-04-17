import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { formatLastSeen } from "./ChatHelpers";
import { UserAvatar } from "@/components/UserAvatar";
import type { Conversation } from "@/hooks/useChatState";

interface Props {
  conversation: Conversation;
  otherTyping: boolean;
  onBack: () => void;
}

export const ChatHeader = memo(function ChatHeader({ conversation, otherTyping, onBack }: Props) {
  const other = conversation.other_user;
  const isOnline = other?.is_online;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-[hsl(220_22%_6%/0.85)] backdrop-blur-2xl">
      <button
        onClick={onBack}
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <UserAvatar
        userId={other?.user_id || ""}
        username={other?.username || "?"}
        avatarUrl={other?.avatar_url}
        size="sm"
        online={isOnline}
      />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-sm font-bold text-foreground truncate">{other?.username || "Noma'lum"}</h2>
        <p className="font-mono text-[10px]">
          {otherTyping ? (
            <span className="text-primary animate-pulse">yozmoqda...</span>
          ) : isOnline ? (
            <span className="text-[hsl(142_70%_48%)]">● online</span>
          ) : (
            <span className="text-muted-foreground/70">{formatLastSeen(other?.last_seen)}</span>
          )}
        </p>
      </div>
    </header>
  );
});
