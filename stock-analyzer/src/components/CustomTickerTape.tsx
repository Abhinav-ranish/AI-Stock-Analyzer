"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowDown, ArrowUp } from "lucide-react";

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

export default function CustomTickerTape() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const res = await axios.get("/api/market");
        setQuotes(res.data);
      } catch (e) {
        console.error("Failed to fetch market data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  if (loading || quotes.length === 0) return null;

  // Duplicate for seamless scroll
  const duplicated = [...quotes, ...quotes, ...quotes, ...quotes];

  return (
    <div className="w-full flex overflow-hidden whitespace-nowrap bg-background/50 border-b border-border/10 py-3 relative group">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointers-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointers-events-none" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes custom-fast-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 4 * 2)); }
        }
        .animate-ticker-slide {
          animation: custom-fast-scroll 45s linear infinite;
        }
        .animate-ticker-slide:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="flex gap-10 animate-ticker-slide pr-10 items-center will-change-transform">
        {duplicated.map((q, idx) => (
          <div key={`${q.symbol}-${idx}`} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-md px-2 py-1 transition-colors">
            <span className="font-bold text-sm tracking-wider">{q.symbol}</span>
            <span className="text-sm font-medium">{q.price.toFixed(2)}</span>
            <span className={`flex items-center text-sm font-semibold rounded-sm px-1.5 py-0.5 ${q.change >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>
              {q.change >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              {Math.abs(q.change).toFixed(2)} ({Math.abs(q.changePercent).toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
