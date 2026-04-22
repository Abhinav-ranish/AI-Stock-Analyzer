"use client";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export default function TVTechnicalAnalysis({ ticker, height = 450 }: { ticker: string; height?: number }) {
  const { resolvedTheme } = useTheme();
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
      colorTheme: resolvedTheme === "dark" ? "dark" : "light",
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [ticker, height, resolvedTheme]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
