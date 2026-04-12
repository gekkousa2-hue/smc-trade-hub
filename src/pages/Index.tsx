import { Activity, TrendingUp, Zap, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import XauusdChart from "@/components/XauusdChart";

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-20">
      {/* Header */}

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
