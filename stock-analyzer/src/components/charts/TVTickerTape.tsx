"use client";
import { useEffect, useRef } from "react";

export default function TVTickerTape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NASDAQ:TSLA" },
        { proName: "NASDAQ:AAPL" },
        { proName: "NASDAQ:NVDA" },
        { proName: "NASDAQ:MSFT" },
        { proName: "NASDAQ:AMZN" },
        { proName: "NASDAQ:GOOGL" },
        { proName: "NASDAQ:META" },
      ],
      showSymbolLogo: true,
      colorTheme: "black",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "en",
    });

    ref.current.innerHTML = "";
    ref.current.appendChild(script);
  }, []);

  return <div ref={ref} className="w-full" />;
}
