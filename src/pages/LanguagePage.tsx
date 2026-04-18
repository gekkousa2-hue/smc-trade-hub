import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

const LANGS = [
  { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export default function LanguagePage({ onBack }: Props) {
  const { t } = useTranslation();
  const { settings, update } = useUserSettings();

  const handleSelect = async (code: string) => {
    await update({ language: code });
    toast.success(t("lang.updated"));
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
        <h1 className="font-display text-lg font-bold text-foreground">{t("settings.language")}</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-5 max-w-md mx-auto"
      >
        <div className="premium-card rounded-2xl overflow-hidden divide-y divide-border/30">
          {LANGS.map((lang) => {
            const active = settings.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className="w-full flex items-center gap-3 px-4 py-4 transition-colors hover:bg-primary/5 active:bg-primary/10"
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium text-foreground flex-1 text-left">{lang.label}</span>
                {active && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
