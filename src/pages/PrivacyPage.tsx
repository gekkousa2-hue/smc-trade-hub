import { motion } from "framer-motion";
import { ArrowLeft, Eye, Clock, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props { onBack: () => void; }

export default function PrivacyPage({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings, update } = useUserSettings();

  const toggle = async (key: "show_online_status" | "show_last_seen" | "show_read_receipts", value: boolean) => {
    await update({ [key]: value } as any);
    toast.success(t("notif.updated"));
  };

  const items = [
    { key: "show_online_status" as const, label: t("privacy.online"), desc: t("privacy.online_desc"), Icon: Eye, value: settings.show_online_status },
    { key: "show_last_seen" as const, label: t("privacy.last_seen"), desc: t("privacy.last_seen_desc"), Icon: Clock, value: settings.show_last_seen },
    { key: "show_read_receipts" as const, label: t("privacy.read_receipts"), desc: t("privacy.read_receipts_desc"), Icon: CheckCheck, value: settings.show_read_receipts },
  ];

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/85 backdrop-blur-2xl">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("privacy.title")}</h1>
      </header>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-5 max-w-md mx-auto">
        <div className="premium-card rounded-2xl overflow-hidden divide-y divide-border/30">
          {items.map(({ key, label, desc, Icon, value }) => (
            <div key={key} className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch checked={value} onCheckedChange={(v) => toggle(key, v)} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
