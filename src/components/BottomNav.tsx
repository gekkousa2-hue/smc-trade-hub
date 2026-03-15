import { CandlestickChart, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
  activeTab: "chart" | "chat" | "profile";
  onTabChange: (tab: "chart" | "chat" | "profile") => void;
}

const tabs = [
  { id: "chart" as const, label: "Grafik", icon: CandlestickChart },
  { id: "chat" as const, label: "Chat", icon: MessageCircle },
  { id: "profile" as const, label: "Profil", icon: User },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-[hsl(220_20%_6%/0.95)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center gap-0.5 px-6 py-1.5 transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId="bottomNavIndicator"
                  className="absolute -top-2 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_12px_2px_hsl(45_93%_58%/0.5)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground/60"
                }`}
              />
              <span
                className={`font-mono text-[10px] tracking-wider transition-colors ${
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
    </nav>
  );
}
