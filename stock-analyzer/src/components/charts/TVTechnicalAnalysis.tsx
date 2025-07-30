"use client";
import { useEffect, useRef } from "react";

export default function TVTechnicalAnalysis({ ticker, height = 450 }: { ticker: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !ref.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      interval: "1M",
      width: "100%",
      isTransparent: true,
      height,
      symbol: ticker,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: "black",
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [ticker, height]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
