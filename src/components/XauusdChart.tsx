import { useEffect, useRef, useState } from "react";

export default function XauusdChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval: "1",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      allow_symbol_change: false,
      calendar: false,
      hide_volume: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: true,
      support_host: "https://www.tradingview.com",
    });

    script.onload = () => setIsLoaded(true);

    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    const timeout = setTimeout(() => setIsLoaded(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 180px)", minHeight: "500px" }}>
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="font-mono text-xs text-muted-foreground">Grafik yuklanmoqda...</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full h-full [&_.tradingview-widget-copyright]:!hidden"
      />
      <style>{`.tradingview-widget-copyright { display: none !important; }`}</style>
    </div>
  );
}
