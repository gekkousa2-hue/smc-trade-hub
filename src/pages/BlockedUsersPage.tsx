import { motion } from "framer-motion";
import { ArrowLeft, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

export default function BlockedUsersPage({ onBack }: Props) {
  const { t } = useTranslation();
  const { blocked, loading, unblock } = useBlockedUsers();

  const handleUnblock = async (id: string) => {
    if (!confirm(t("blocked.confirm_unblock"))) return;
    await unblock(id);
    toast.success(t("blocked.unblocked"));
  };

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-[hsl(220_22%_6%/0.85)] backdrop-blur-2xl">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("blocked.title")}</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-5 max-w-md mx-auto"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl glass border-glow mb-4">
              <Ban className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">{t("blocked.empty")}</p>
          </div>
        ) : (
          <div className="premium-card rounded-2xl overflow-hidden divide-y divide-border/30">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar
                  userId={b.blocked_id}
                  username={b.profile?.username || "?"}
                  avatarUrl={b.profile?.avatar_url || null}
                  size="sm"
                />
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {b.profile?.username || "—"}
                </span>
                <button
                  onClick={() => handleUnblock(b.blocked_id)}
                  className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-95"
                >
                  {t("blocked.unblock")}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
