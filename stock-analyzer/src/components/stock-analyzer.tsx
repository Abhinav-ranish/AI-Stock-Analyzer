"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import StockLinks from "./stock-links";
import TradingViewWidget from "./trading-view";
import { Maximize2 } from "lucide-react";
import { marked } from "marked";

const renderMarkdown = (md: string) => marked(md);

type StockResponse = {
  ticker: string;
  ai_analysis: string;
  scores: {
    fund_score: number;
    tech_score: number;
    news_score: number;
    insider_score: number;
    final_score: number;
    sma_50: number;
    sma_200: number;
  };
  technical: {
    rsi: number;
    macd: number;
    signal: number;
    trend_zone: string;
    volume_spike: boolean;
    last_candle: string;
    sma_50: number;
    sma_200: number;
  };
  fundamental: {
    pb_ratio?: number;
    trailing_pe?: number;
    market_cap?: number;
    earnings_growth?: number;
    revenue_growth?: number;
    fpe?: number;
  };
  news: {
    sentiment_counts: Record<string, number>;
    top_stories: string[];
  };
};

export default function StockAnalyzer() {
  const [height, setHeight] = useState(600);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHeight(window.innerHeight * 0.85); // not full height, better spacing
    }
  }, []);
  const [ticker, setTicker] = useState("");
  const [term, setTerm] = useState<"short" | "long">("long");
  const [penny, setPenny] = useState(false);
  const [age, setAge] = useState<number | undefined>();
  const [riskProfile, setRiskProfile] = useState("");
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanTicker = ticker.trim().toUpperCase();
  if (cleanTicker !== ticker) setTicker(cleanTicker);

  const fetchStockData = async () => {
    if (!ticker) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        ticker,
        term,
        penny: penny.toString(),
        ...(age ? { age: String(age) } : {}),
        ...(riskProfile ? { risk_profile: riskProfile } : {}),
      });

      const res = await fetch(`http://127.0.0.1:5000/analysis/?${query}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };
  function formatMarketCap(value?: number) {
    if (!value || value < 1) return "N/A";
    const billion = 1_000_000_000;
    const million = 1_000_000;
    return value >= billion
      ? `$${(value / billion).toFixed(1)}B`
      : `$${(value / million).toFixed(1)}M`;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      <div className="sticky top-0 z-50 bg-background py-2 border-b">
        <StockLinks ticker={ticker} />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker..."
        />
        <Button onClick={fetchStockData} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <select
          value={term}
          onChange={(e) => setTerm(e.target.value as "short" | "long")}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="long">Long Term</option>
          <option value="short">Short Term</option>
        </select>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={penny}
            onChange={(e) => setPenny(e.target.checked)}
          />
          Penny Stock?
        </label>

        <Input
          type="number"
          placeholder="Age"
          value={age ?? ""}
          onChange={(e) => setAge(Number(e.target.value))}
        />

        <Input
          placeholder="Risk profile (e.g. high)"
          value={riskProfile}
          onChange={(e) => setRiskProfile(e.target.value)}
        />
      </div>

      {/* DATA SECTION */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* LEFT: TradingView + Fullscreen */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-sm">Live Chart</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="ml-auto">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="z-50 bg-black/90 backdrop-blur-md w-screen h-screen max-w-none max-h-none rounded-none overflow-hidden">
                    <DialogTitle className="sr-only">
                      Fullscreen Chart
                    </DialogTitle>

                    <div className="w-full h-full">
                      <TradingViewWidget ticker={ticker} height={height} />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <TradingViewWidget ticker={ticker} height={400} />
            </CardContent>
          </Card>

          {/* RIGHT: Tabs for AI + Scores */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="scores">Score & Indicators</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card>
                <CardContent className="p-4 whitespace-pre-line">
                  <h2 className="text-xl font-semibold mb-2">
                    AI Summary for {ticker}
                  </h2>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(data.ai_analysis),
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores">
              <Card>
                <CardContent className="p-4 space-y-6">
                  {/* Top Row: Technical + Fundamental side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Technicals */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg ">Technicals</h3>
                      <p>
                        <strong>RSI:</strong> {data.technical.rsi}
                      </p>
                      <p>
                        <strong>MACD:</strong> {data.technical.macd} | Signal:{" "}
                        {data.technical.signal}
                      </p>

                      <p>
                        <strong>SMA 50:</strong>{" "}
                        {data.technical.sma_50 ?? "N/A"} |{" "}
                        <strong>SMA 200:</strong>{" "}
                        {data.technical.sma_200 ?? "N/A"}
                      </p>

                      <p>
                        <strong>Trend Zone:</strong> {data.technical.trend_zone}
                      </p>
                      <p>
                        <strong>Last Candle:</strong>{" "}
                        {data.technical.last_candle}
                      </p>
                      <p>
                        <strong>Volume Spike:</strong>{" "}
                        {data.technical.volume_spike ? "Yes" : "No"}
                      </p>
                    </div>

                    {/* Fundamentals */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg ">Fundamentals</h3>
                      <p>
                        <strong>P/B Ratio:</strong>{" "}
                        {data.fundamental.pb_ratio?.toFixed(2) ?? "N/A"}
                      </p>
                      <p>
                        <strong>Trailing P/E:</strong>{" "}
                        {data.fundamental.trailing_pe?.toFixed(2) ?? "N/A"}
                      </p>
                      <p>
                        <strong>Forward P/E:</strong>{" "}
                        {data.fundamental?.fpe ?? "N/A"}
                      </p>
                      <p>
                        <strong>Market Cap:</strong>{" "}
                        {data.fundamental?.market_cap ?? "N/A"}
                      </p>
                      <p>
                        <strong>Earnings Growth:</strong>{" "}
                        {data.fundamental?.earnings_growth ?? "N/A"}
                      </p>
                      <p>
                        <strong>Revenue Growth:</strong>{" "}
                        {data.fundamental?.revenue_growth ?? "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* News Sentiment */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg  mb-1">
                      News Sentiment
                    </h3>
                    <div className="text-sm  flex gap-4">
                      <span>
                        🟢 Positive: {data.news.sentiment_counts.positive || 0}
                      </span>
                      <span>
                        🟡 Neutral: {data.news.sentiment_counts.neutral || 0}
                      </span>
                      <span>
                        🔴 Negative: {data.news.sentiment_counts.negative || 0}
                      </span>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg  mb-1">
                      Score Breakdown
                    </h3>
                    <ul className="ml-4 list-disc text-sm ">
                      <li>Fundamentals: {data.scores.fund_score}</li>
                      <li>Technical: {data.scores.tech_score}</li>
                      <li>News: {data.scores.news_score}</li>
                      <li>Insider: {data.scores.insider_score}</li>
                      <li className="font-semibold">
                        Final Score: {data.scores.final_score}
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
