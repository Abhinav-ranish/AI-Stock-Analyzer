"use client";
import { useEffect, useRef } from "react";

type Props = {
  ticker: string;
  height?: number;
};

export default function TradingViewWidget({ ticker, height = 600 }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !container.current) return;

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: ticker,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      height,
      width: "100%", // 👈 ADD THIS
    });

    container.current.innerHTML = "";
    container.current.appendChild(script);
  }, [ticker, height]);

  return <div ref={container} className={`w-full`} style={{ height }} />;
}
