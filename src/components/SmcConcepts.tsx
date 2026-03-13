import { TrendingUp, ArrowDownUp, Layers, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const concepts = [
  {
    icon: TrendingUp,
    title: "Break of Structure",
    tag: "BOS",
    tagColor: "bg-success/15 text-success border border-success/20",
    glowVar: "--glow-success",
    description:
      "A BOS occurs when price breaks a recent swing high or swing low, confirming the continuation of the current trend. It signals smart money commitment to the existing direction.",
    keyPoints: [
      "Bullish BOS: breaks above the most recent higher high",
      "Bearish BOS: breaks below the most recent lower low",
      "Look for entries on pullbacks after BOS confirmation",
    ],
  },
  {
    icon: ArrowDownUp,
    title: "Change of Character",
    tag: "CHoCH",
    tagColor: "bg-primary/15 text-primary border border-primary/20",
    glowVar: "--glow-primary",
    description:
      "A CHoCH marks the first sign of a potential trend reversal. Price breaks a key structural level in the opposite direction, indicating a shift in institutional order flow.",
    keyPoints: [
      "Bullish CHoCH: breaks above a lower high in a downtrend",
      "Bearish CHoCH: breaks below a higher low in an uptrend",
      "Use with confluence for high-probability reversal setups",
    ],
  },
  {
    icon: Layers,
    title: "Order Block",
    tag: "OB",
    tagColor: "bg-chart-bear/15 text-chart-bear border border-chart-bear/20",
    glowVar: "--glow-bear",
    description:
      "An Order Block is the last opposing candle before a strong impulsive move. It represents an area where institutions placed significant orders — price tends to revisit these zones.",
    keyPoints: [
      "Bullish OB: last bearish candle before a strong up-move",
      "Bearish OB: last bullish candle before a strong down-move",
      "Best as entry zones with BOS or CHoCH confirmation",
    ],
  },
];

const container = {
  animate: { transition: { staggerChildren: 0.12 } },
};

const item = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function SmcConcepts() {
  return (
    <motion.div
      className="grid gap-5 md:grid-cols-3"
      variants={container}
      initial="initial"
      animate="animate"
    >
      {concepts.map((c) => (
        <motion.div
          key={c.tag}
          variants={item}
          whileHover={{ y: -4, transition: { duration: 0.25 } }}
          className="group relative rounded-xl glass border-glow p-6 cursor-pointer transition-all duration-300 glass-hover"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
                <c.icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              </div>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${c.tagColor}`}>
                {c.tag}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
          </div>

          {/* Content */}
          <h3 className="mb-2 font-display text-base font-bold text-foreground group-hover:text-gradient-gold transition-all">
            {c.title}
          </h3>
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{c.description}</p>

          {/* Key Points */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            {c.keyPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-secondary-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
