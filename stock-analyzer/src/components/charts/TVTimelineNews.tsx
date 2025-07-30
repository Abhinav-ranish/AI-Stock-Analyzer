"use client";
import { useEffect, useRef } from "react";

export default function TVTimelineNews({ ticker, height = 550 }: { ticker: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !ref.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      feedMode: "symbol",
      symbol: `NASDAQ:${ticker.toUpperCase()}`, 
      colorTheme: "black",
      isTransparent: true,
      displayMode: "regular",
      width: "100%",
      height,
      locale: "en",
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [ticker, height]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
