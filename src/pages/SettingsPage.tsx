import { motion } from "framer-motion";
import { ChevronRight, ArrowLeft, Languages, Ban, Bell, Lock, Palette, KeyRound, Trash2, HelpCircle, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";

interface Props {
  onBack: () => void;
  onNavigate: (page: "language" | "blocked" | "edit-profile" | "notifications" | "privacy" | "theme" | "password" | "delete" | "help") => void;
}

export default function SettingsPage({ onBack, onNavigate }: Props) {
  const { t } = useTranslation();
  const { settings } = useUserSettings();

  const langLabel: Record<string, string> = { uz: "O'zbekcha", en: "English", ru: "Русский" };

  const sections = [
    {
      title: t("settings.account"),
      items: [
        { icon: Edit2, label: t("settings.edit_profile"), key: "edit-profile" as const, color: "text-primary" },
      ],
    },
    {
      title: t("settings.preferences"),
      items: [
        { icon: Languages, label: t("settings.language"), key: "language" as const, color: "text-[hsl(210_80%_60%)]", value: langLabel[settings.language] },
        { icon: Palette, label: t("settings.theme"), key: "theme" as const, color: "text-[hsl(280_70%_65%)]", value: settings.theme === "dark" ? "Dark" : "Light", soon: true },
        { icon: Bell, label: t("settings.notifications"), key: "notifications" as const, color: "text-[hsl(45_93%_58%)]", soon: true },
        { icon: Lock, label: t("settings.privacy"), key: "privacy" as const, color: "text-[hsl(160_70%_50%)]", soon: true },
        { icon: Ban, label: t("settings.blocked_users"), key: "blocked" as const, color: "text-[hsl(0_70%_60%)]" },
      ],
    },
    {
      title: t("settings.security"),
      items: [
        { icon: KeyRound, label: t("settings.change_password"), key: "password" as const, color: "text-[hsl(40_90%_60%)]", soon: true },
        { icon: Trash2, label: t("settings.delete_account"), key: "delete" as const, color: "text-destructive", soon: true },
      ],
    },
    {
      title: t("settings.help"),
      items: [
        { icon: HelpCircle, label: t("settings.about"), key: "help" as const, color: "text-muted-foreground", soon: true },
      ],
    },
  ];

  return (
    <div className="min-h-full pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-[hsl(220_22%_6%/0.85)] backdrop-blur-2xl">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("settings.title")}</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-5 space-y-6 max-w-md mx-auto"
      >
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
              {section.title}
            </h3>
            <div className="premium-card rounded-2xl overflow-hidden divide-y divide-border/30">
              {section.items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => !item.soon && onNavigate(item.key)}
                  disabled={item.soon}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-primary/5 active:bg-primary/10 disabled:opacity-50"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-card/60 ring-1 ring-border/40 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
                  {item.value && <span className="text-xs text-muted-foreground font-mono">{item.value}</span>}
                  {item.soon && <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">soon</span>}
                  {!item.soon && <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
