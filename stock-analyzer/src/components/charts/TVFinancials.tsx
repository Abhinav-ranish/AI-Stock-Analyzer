"use client";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export default function TVFinancials({ ticker, height = 550 }: { ticker: string; height?: number }) {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !ref.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbol: ticker,
      colorTheme: resolvedTheme === "dark" ? "dark" : "light",
      isTransparent: true,
      locale: "en",
      displayMode: "regular",
      width: "100%",
      height,
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [ticker, height, resolvedTheme]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
