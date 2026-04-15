import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { getInitials, getAvatarColor, formatLastSeen } from "./ChatHelpers";
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
    <header className="glass sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30">
      <button
        onClick={onBack}
        className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="relative">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(other?.user_id || "")}`}>
          {getInitials(other?.username || "?")}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[hsl(142_60%_45%)] border-2 border-background" />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-sm font-bold text-foreground truncate">{other?.username || "Noma'lum"}</h2>
        <p className="font-mono text-[10px] text-primary/60">
          {otherTyping ? (
            <span className="text-primary animate-pulse">yozmoqda...</span>
          ) : isOnline ? (
            "Online"
          ) : (
            `oxirgi marta: ${formatLastSeen(other?.last_seen)}`
          )}
        </p>
      </div>
    </header>
  );
});
