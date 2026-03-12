import { TrendingUp, ArrowDownUp, Layers } from "lucide-react";
import { motion } from "framer-motion";

const concepts = [
  {
    icon: TrendingUp,
    title: "Break of Structure (BOS)",
    tag: "BOS",
    tagColor: "bg-success/20 text-success",
    description:
      "A BOS occurs when price breaks a recent swing high (in an uptrend) or swing low (in a downtrend), confirming the continuation of the current trend. It signals that smart money is still committed to the existing direction.",
    keyPoints: [
      "Bullish BOS: price breaks above the most recent higher high",
      "Bearish BOS: price breaks below the most recent lower low",
      "Confirms trend continuation — look for entries on pullbacks after BOS",
    ],
  },
  {
    icon: ArrowDownUp,
    title: "Change of Character (CHoCH)",
    tag: "CHoCH",
    tagColor: "bg-primary/20 text-primary",
    description:
      "A CHoCH marks the first sign of a potential trend reversal. It happens when price breaks a key structural level in the opposite direction of the prevailing trend, indicating a shift in institutional order flow.",
    keyPoints: [
      "Bullish CHoCH: price breaks above a lower high after a downtrend",
      "Bearish CHoCH: price breaks below a higher low after an uptrend",
      "Often precedes a full reversal — use with confluence for high-probability setups",
    ],
  },
  {
    icon: Layers,
    title: "Order Block (OB)",
    tag: "OB",
    tagColor: "bg-chart-bear/20 text-chart-bear",
    description:
      "An Order Block is the last opposing candle before a strong impulsive move. It represents an area where institutions placed significant orders. Price tends to revisit these zones before continuing the impulse direction.",
    keyPoints: [
      "Bullish OB: last bearish candle before a strong up-move",
      "Bearish OB: last bullish candle before a strong down-move",
      "Best used as entry zones when combined with BOS or CHoCH confirmation",
    ],
  },
];

export default function SmcConcepts() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {concepts.map((c) => (
        <div
          key={c.tag}
          className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.15)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
              <c.icon className="h-5 w-5 text-primary" />
            </div>
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ${c.tagColor}`}>
              {c.tag}
            </span>
          </div>
          <h3 className="mb-2 font-display text-lg font-bold text-foreground">{c.title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
          <ul className="space-y-2">
            {c.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-secondary-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
