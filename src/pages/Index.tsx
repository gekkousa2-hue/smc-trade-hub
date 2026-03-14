import { Activity, TrendingUp, Zap, Clock, BarChart3, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import XauusdChart from "@/components/XauusdChart";
import SmcConcepts from "@/components/SmcConcepts";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass sticky top-0 z-50 px-6 py-4"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-[0_0_20px_-4px_hsl(45_93%_58%/0.4)]">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-gradient-gold">SMC Terminal</span>
              <p className="font-mono text-[10px] text-muted-foreground tracking-wider">INSTITUTIONAL TRADING</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <span className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" />
                <span>UTC</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/chat"
                className="flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 font-display text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 shadow-[0_0_20px_-4px_hsl(45_93%_58%/0.3)]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </Link>
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-mono text-xs font-medium text-foreground">XAUUSD</span>
                <Zap className="h-3 w-3 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Chart Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-xl glass border-glow overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">XAUUSD</h2>
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider">GOLD / US DOLLAR</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {["1H", "4H", "1D", "1W"].map((tf, i) => (
                <span
                  key={tf}
                  className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-colors cursor-pointer ${
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

        {/* SMC Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-8 bg-primary/60" />
                <span className="font-mono text-[10px] font-semibold tracking-[0.2em] text-primary">EDUCATION</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">Smart Money Concepts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Key institutional trading concepts used to decode market structure and order flow.
              </p>
            </div>
          </div>
          <SmcConcepts />
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="border-t border-border/50 py-6 text-center"
        >
          <p className="font-mono text-[11px] text-muted-foreground">
            SMC Terminal — Built for institutional-grade analysis
          </p>
        </motion.footer>
      </main>
    </div>
  );
};

export default Index;
