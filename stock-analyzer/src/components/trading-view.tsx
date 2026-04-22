"use client";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

type Props = {
  ticker: string;
  height?: number;
};

export default function TVAdvancedChart({ ticker, height = 500}: Props) {
  const { resolvedTheme } = useTheme();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !container.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbol: ticker,
      interval: "D",
      autosize: true,
      timezone: "Etc/UTC",
      theme: resolvedTheme === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.06)",
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      hide_volume: false,
      allow_symbol_change: true,
      calendar: false,
      studies: ["Moving Average Ribbon@tv-basicstudies"],
    });

    container.current.innerHTML = "";
    container.current.appendChild(script);
  }, [ticker, resolvedTheme]);

  return <div ref={container} className="w-full" style={{ height }} />;
}
