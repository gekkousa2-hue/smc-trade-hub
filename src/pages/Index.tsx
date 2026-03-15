import { Activity, TrendingUp, Zap, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import XauusdChart from "@/components/XauusdChart";

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass sticky top-0 z-40 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-[0_0_20px_-4px_hsl(45_93%_58%/0.4)]">
              <Activity className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-gradient-gold">SMC Terminal</span>
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider">INSTITUTIONAL TRADING</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="h-3 w-px bg-border" />
              <BarChart3 className="h-3 w-3" />
              <span>UTC</span>
            </div>
            <div className="flex items-center gap-2 rounded-full glass px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="font-mono text-xs font-medium text-foreground">XAUUSD</span>
              <Zap className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Chart Section */}
      <main className="p-3">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-xl glass border-glow overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">XAUUSD</h2>
                <p className="font-mono text-[9px] text-muted-foreground tracking-wider">GOLD / US DOLLAR</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {["1H", "4H", "1D", "1W"].map((tf, i) => (
                <span
                  key={tf}
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-colors cursor-pointer ${
                    i === 2
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tf}
                </span>
              ))}
            </div>
          </div>
          <div className="p-1">
            <XauusdChart />
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Index;
