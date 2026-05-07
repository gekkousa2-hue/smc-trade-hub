import { motion } from "framer-motion";
import { ArrowLeft, Bell, Volume2, Vibrate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props { onBack: () => void; }

export default function NotificationsPage({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings, update } = useUserSettings();

  const toggle = async (key: "notifications_enabled" | "sound_enabled" | "vibration_enabled", value: boolean) => {
    await update({ [key]: value } as any);
    toast.success(t("notif.updated"));
    if (key === "vibration_enabled" && value && "vibrate" in navigator) {
      navigator.vibrate?.(60);
    }
  };

  const items = [
    { key: "notifications_enabled" as const, label: t("notif.enabled"), desc: t("notif.enabled_desc"), Icon: Bell, value: settings.notifications_enabled },
    { key: "sound_enabled" as const, label: t("notif.sound"), desc: t("notif.sound_desc"), Icon: Volume2, value: settings.sound_enabled, disabled: !settings.notifications_enabled },
    { key: "vibration_enabled" as const, label: t("notif.vibration"), desc: t("notif.vibration_desc"), Icon: Vibrate, value: settings.vibration_enabled, disabled: !settings.notifications_enabled },
  ];

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/85 backdrop-blur-2xl">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("notif.title")}</h1>
      </header>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-5 max-w-md mx-auto">
        <div className="premium-card rounded-2xl overflow-hidden divide-y divide-border/30">
          {items.map(({ key, label, desc, Icon, value, disabled }) => (
            <div key={key} className={`flex items-center gap-3 px-4 py-4 ${disabled ? "opacity-50" : ""}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch checked={value} disabled={disabled} onCheckedChange={(v) => toggle(key, v)} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
