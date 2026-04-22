"use client";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export default function TVSymbolInfo({ ticker }: { ticker: string }) {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !ref.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbol: ticker,
      width: "100%",
      locale: "en",
      colorTheme: resolvedTheme === "dark" ? "dark" : "light",
      isTransparent: true,
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, [ticker, resolvedTheme]);

  return <div ref={ref} className="w-full" />;
}
