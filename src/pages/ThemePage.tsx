import { motion } from "framer-motion";
import { ArrowLeft, Check, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";

interface Props { onBack: () => void; }

export default function ThemePage({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings, update } = useUserSettings();

  const select = async (theme: "dark" | "light") => {
    await update({ theme });
    toast.success(t("theme.updated"));
  };

  const options = [
    { code: "dark" as const, label: t("theme.dark"), desc: t("theme.dark_desc"), Icon: Moon },
    { code: "light" as const, label: t("theme.light"), desc: t("theme.light_desc"), Icon: Sun },
  ];

  return (
    <div className="min-h-full pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/85 backdrop-blur-2xl">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">{t("theme.title")}</h1>
      </header>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-5 max-w-md mx-auto space-y-3">
        {options.map(({ code, label, desc, Icon }) => {
          const active = settings.theme === code;
          return (
            <button
              key={code}
              onClick={() => select(code)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl premium-card transition-all ${active ? "ring-2 ring-primary/60 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.5)]" : "hover:border-primary/30"}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-card/60 ring-1 ring-border/40 text-primary"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              {active && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
