import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickData, Time, CandlestickSeries } from "lightweight-charts";

// Generate realistic XAUUSD data
function generateXauusdData(): CandlestickData<Time>[] {
  const data: CandlestickData<Time>[] = [];
  let price = 2340;
  const startDate = new Date("2024-06-01");

  for (let i = 0; i < 120; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = 15 + Math.random() * 25;
    const trend = Math.sin(i / 20) * 8 + (Math.random() - 0.45) * 10;
    const open = price;
    const close = open + trend + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.6;
    const low = Math.min(open, close) - Math.random() * volatility * 0.6;

    data.push({
      time: date.toISOString().split("T")[0] as Time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });

    price = close;
  }
  return data;
}

export default function XauusdChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(215, 15%, 55%)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "hsl(220, 14%, 15%)" },
        horzLines: { color: "hsl(220, 14%, 15%)" },
      },
      crosshair: {
        vertLine: { color: "hsl(45, 93%, 58%)", width: 1, style: 2, labelBackgroundColor: "hsl(45, 93%, 58%)" },
        horzLine: { color: "hsl(45, 93%, 58%)", width: 1, style: 2, labelBackgroundColor: "hsl(45, 93%, 58%)" },
      },
      rightPriceScale: {
        borderColor: "hsl(220, 14%, 18%)",
      },
      timeScale: {
        borderColor: "hsl(220, 14%, 18%)",
        timeVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "hsl(142, 60%, 45%)",
      downColor: "hsl(0, 72%, 55%)",
      borderUpColor: "hsl(142, 60%, 45%)",
      borderDownColor: "hsl(0, 72%, 55%)",
      wickUpColor: "hsl(142, 60%, 50%)",
      wickDownColor: "hsl(0, 72%, 60%)",
    });

    series.setData(generateXauusdData());
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-[450px]" />;
}
