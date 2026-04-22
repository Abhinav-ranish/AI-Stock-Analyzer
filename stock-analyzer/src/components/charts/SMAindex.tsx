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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbol: ticker,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      backgroundColor: "rgba(255, 255, 255, 1)",
      gridColor: "rgba(0, 0, 0, 0.06)",
      width: "100%",
      height,
      studies: ["Moving Average Ribbon"], // 👈 replace with actual username@title
    });

    container.current.innerHTML = "";
    container.current.appendChild(script);
  }, [ticker, height]);

  return <div ref={container} className="w-full dark:invert dark:hue-rotate-180" style={{ height }} />;
}
