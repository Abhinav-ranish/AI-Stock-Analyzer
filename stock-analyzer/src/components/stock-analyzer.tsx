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
import TVAdvancedChart from "./trading-view";
import { Maximize2 } from "lucide-react";
import { marked } from "marked";
import TradingViewWidgetSMA from "./charts/SMAindex";
import { toast } from "sonner";
import TVTimelineNews from "./charts/TVTimelineNews";
import TVTickerTape from "./charts/TVTickerTape";
import TVTechnicalAnalysis from "./charts/TVTechnicalAnalysis";
import TVFinancials from "./charts/TVFinancials";
import TVSymbolInfo from "./charts/TVSymbolInfo";
import TVSymbolProfile from "./charts/TVSymbolProfile";
import TickerSearchInput from "./Search-bar";

const renderMarkdown = (md: string) => marked(md || "_No data found._");

type StockResponse = {
  ticker: string;
  ai_analysis: string;
  scores: {
    fund_score: number;
    tech_score: number;
    news_score: number;
    insider_score: number;
    final_score: number;
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
    ema_crossover: string;
    squeeze_zone: string;
  };
  fundamentals: {
    pb?: number;
    pe?: number;
    forward_pe?: number;
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

type ParsedSections = {
  recommendation: string;
  strengths: string;
  weaknesses: string;
  fundamentals: string;
  verdict: string;
};

function parseSections(md: string): ParsedSections {
  const verdictMatch = md.match(/^## \*\*(.+?)\*\*/m);
  const verdict = verdictMatch?.[1] || "";

  const recSplit = md.split("##");

  const strengthSplit = md.split("## Strengths");
  const weaknessSplit = strengthSplit[1]?.split("## Weaknesses");
  const fundamentalsSplit = weaknessSplit?.[1]?.split("## Fundamentals");

  return {
    recommendation: (recSplit[1] || "").trim(),
    strengths: weaknessSplit?.[0]?.trim() || "",
    weaknesses: fundamentalsSplit?.[0]?.trim() || "",
    fundamentals: fundamentalsSplit?.[1]?.trim() || "",
    verdict: verdict.toUpperCase(),
  };
}

export default function StockAnalyzer() {
  const [height, setHeight] = useState(600);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHeight(window.innerHeight * 0.85);
    }
  }, []);

  const [ticker, setTicker] = useState("");
  const [term, setTerm] = useState<"short" | "long">("long");
  const [penny, setPenny] = useState(false);
  const [age, setAge] = useState<number | undefined>();
  const [riskProfile, setRiskProfile] = useState("");
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);

  const sections: ParsedSections = data
    ? parseSections(data.ai_analysis)
    : {
        recommendation: "",
        strengths: "",
        weaknesses: "",
        fundamentals: "",
        verdict: "",
      };

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
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.aranish.uk";
      const res = await fetch(`${baseUrl}/analysis/?${query}`);

      if (!res.ok) {
        toast.error("Failed to fetch stock data. Please try again.");
        throw new Error("Failed to fetch");
      }
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
      <div className="fixed left-5 top-1/2 -translate-y-1/2 z-50 hidden sm:block">
        <StockLinks ticker={ticker} />
      </div>
      <div className="mb-4 dark:invert scale-[1] rounded-md overflow-hidden">
        <TVTickerTape />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <TickerSearchInput value={ticker} onChange={setTicker} />
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

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="mt-[-1.5rem] flex justify-between items-center">
                <h2 className="font-semibold text-sm">Live Chart</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="ml-auto">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="!max-w-none !w-screen !h-screen z-50 bg-black/90 backdrop-blur-md rounded-none overflow-hidden">
                    <DialogTitle className="sr-only">
                      Fullscreen Chart
                    </DialogTitle>
                    <div className=" h-full">
                      <TVAdvancedChart ticker={ticker} height={height} />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <TVAdvancedChart ticker={ticker} height={400} />
            </CardContent>
          </Card>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="">
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="scores">Score & Indicators</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card>
                <CardContent className="p-4">
                  <Tabs defaultValue="rec" className="w-full">
                    <div className="flex justify-center mt-[-1.5rem]">
                      <TabsList className="mb-4 justify-center flex-wrap">
                        <TabsTrigger value="rec">
                          <span className="block sm:hidden">💡</span>
                          <span className="hidden sm:inline">
                            💡 Recommendation
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="strengths">
                          <span className="block sm:hidden">📈</span>
                          <span className="hidden sm:inline">📈 Strengths</span>
                        </TabsTrigger>
                        <TabsTrigger value="weaknesses">
                          <span className="block sm:hidden">📉</span>
                          <span className="hidden sm:inline">
                            📉 Weaknesses
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="fundamentals">
                          <span className="block sm:hidden">🧠</span>
                          <span className="hidden sm:inline">
                            🧠 Fundamentals
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="rec">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: marked(sections.recommendation),
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="strengths">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: marked(sections.strengths),
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="weaknesses">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: marked(sections.weaknesses),
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="fundamentals">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: marked(sections.fundamentals),
                        }}
                      />
                    </TabsContent>
                  </Tabs>
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
                        Crossover:{" "}
                        <strong>{data.technical.ema_crossover}</strong>
                      </p>

                      <p>
                        Squeeze Zone:{" "}
                        <strong>{data.technical.squeeze_zone}</strong>
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
                        {data.fundamentals?.pb?.toFixed(2) ?? "N/A"}
                      </p>
                      <p>
                        <strong>Trailing P/E:</strong>{" "}
                        {typeof data.fundamentals?.pe === "number"
                          ? data.fundamentals.pe.toFixed(2)
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Forward P/E:</strong>{" "}
                        {typeof data.fundamentals?.forward_pe === "number"
                          ? data.fundamentals.forward_pe.toFixed(2)
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Market Cap:</strong>{" "}
                        {typeof data.fundamentals?.market_cap === "number"
                          ? formatMarketCap(data.fundamentals.market_cap)
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Earnings Growth:</strong>{" "}
                        {typeof data.fundamentals?.earnings_growth === "number"
                          ? data.fundamentals.earnings_growth
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Revenue Growth:</strong>{" "}
                        {typeof data.fundamentals?.revenue_growth === "number"
                          ? data.fundamentals.revenue_growth
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* News Sentiment */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg mb-1">
                      News Sentiment
                    </h3>
                    {data.news && data.news.sentiment_counts ? (
                      <div className="text-sm flex gap-4">
                        <span>
                          🟢 Positive:{" "}
                          {data.news.sentiment_counts.positive || 0}
                        </span>
                        <span>
                          🟡 Neutral: {data.news.sentiment_counts.neutral || 0}
                        </span>
                        <span>
                          🔴 Negative:{" "}
                          {data.news.sentiment_counts.negative || 0}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        News sentiment data not available.
                      </div>
                    )}
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
          <div className="overflow-hidden dark:invert rounded-lg scale-101 flex">
            <div className="w-full">
              <TVTechnicalAnalysis ticker={ticker} height={450} />
            </div>
          </div>

          <div className="dark:invert rounded-lg scale-101 flex overflow-hidden">
            <TVFinancials ticker={ticker} height={450} />
          </div>
          <div className="dark:invert rounded-lg scale-101 flex justify-center overflow-hidden">
            <TVSymbolProfile ticker={ticker} height={450} />
          </div>
          <div className="rounded-lg dark:invert scale-101 flex justify-center overflow-hidden">
            <TVTimelineNews ticker={ticker} height={450} />
          </div>
        </div>
      )}
    </div>
  );
}
