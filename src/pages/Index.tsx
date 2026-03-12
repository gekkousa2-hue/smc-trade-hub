import { Activity, TrendingUp } from "lucide-react";
import XauusdChart from "@/components/XauusdChart";
import SmcConcepts from "@/components/SmcConcepts";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">SMC Terminal</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="font-mono text-xs text-muted-foreground">XAUUSD</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Chart Section */}
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">XAUUSD — Gold / US Dollar</h2>
            </div>
            <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">Daily</span>
          </div>
          <XauusdChart />
        </section>

        {/* SMC Section */}
        <section>
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Smart Money Concepts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Key institutional trading concepts used to decode market structure and order flow.
            </p>
          </div>
          <SmcConcepts />
        </section>
      </main>
    </div>
  );
};

export default Index;
