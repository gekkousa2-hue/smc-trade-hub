import { Radio, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface BottomNavProps {
  activeTab: "live" | "chat" | "profile";
  onTabChange: (tab: "live" | "chat" | "profile") => void;
  unreadCount?: number;
}

export default function BottomNav({ activeTab, onTabChange, unreadCount = 0 }: BottomNavProps) {
  const { t } = useTranslation();
  const tabs = [
    { id: "live" as const, label: t("nav.live", "Live"), icon: Radio },
    { id: "chat" as const, label: t("nav.chat"), icon: MessageCircle },
    { id: "profile" as const, label: t("nav.profile"), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="border-t border-border/40 bg-[hsl(220_22%_5%/0.85)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === "chat" && unreadCount > 0;
            const isLive = tab.id === "live";
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center gap-1 px-5 py-1.5 transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottomNavGlow"
                    className="absolute inset-x-3 -inset-y-1 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="bottomNavIndicator"
                    className="absolute -top-2 h-1 w-10 rounded-full bg-primary shadow-[0_0_16px_3px_hsl(45_93%_58%/0.7)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative">
                  <tab.icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${
                      isActive
                        ? "text-primary drop-shadow-[0_0_8px_hsl(45_93%_58%/0.6)]"
                        : "text-muted-foreground/60"
                    }`}
                  />
                  {isLive && !isActive && (
                    <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  )}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-[0_0_8px_hsl(45_93%_58%/0.6)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`relative z-10 font-mono text-[10px] tracking-wider transition-colors ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
