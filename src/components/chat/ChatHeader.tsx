import { memo, useState } from "react";
import { ArrowLeft, MoreVertical, Ban, ShieldOff } from "lucide-react";
import { formatLastSeen } from "./ChatHelpers";
import { UserAvatar } from "@/components/UserAvatar";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation } from "@/hooks/useChatState";

interface Props {
  conversation: Conversation;
  otherTyping: boolean;
  onBack: () => void;
}

export const ChatHeader = memo(function ChatHeader({ conversation, otherTyping, onBack }: Props) {
  const { t } = useTranslation();
  const other = conversation.other_user;
  const isOnline = other?.is_online;
  const { isBlocked, block, unblock } = useBlockedUsers();
  const [menuOpen, setMenuOpen] = useState(false);
  const blocked = other?.user_id ? isBlocked(other.user_id) : false;

  const handleBlock = async () => {
    if (!other?.user_id) return;
    setMenuOpen(false);
    if (blocked) {
      await unblock(other.user_id);
      toast.success(t("blocked.unblocked"));
    } else {
      const { error } = await block(other.user_id);
      if (error) toast.error(t("profile.error"));
      else toast.success(t("blocked.blocked"));
    }
  };

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
        <h2 className="font-display text-sm font-bold text-foreground truncate">{other?.username || "—"}</h2>
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

      {/* Menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 min-w-[180px] premium-card rounded-xl overflow-hidden border border-border/40"
              >
                <button
                  onClick={handleBlock}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm transition-colors hover:bg-destructive/10 text-destructive"
                >
                  {blocked ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  <span className="font-medium">{blocked ? t("blocked.unblock") : t("blocked.block")}</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
});
