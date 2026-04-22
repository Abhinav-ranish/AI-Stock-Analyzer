"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
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
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import TradingViewWidgetSMA from "./charts/SMAindex";
import { toast } from "sonner";
import TVTimelineNews from "./charts/TVTimelineNews";
import TVTickerTape from "./charts/TVTickerTape";
import TVTechnicalAnalysis from "./charts/TVTechnicalAnalysis";
import TVFinancials from "./charts/TVFinancials";
import TVSymbolInfo from "./charts/TVSymbolInfo";
import TVSymbolProfile from "./charts/TVSymbolProfile";
import TickerSearchInput from "./Search-bar";

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

  const handleTickerChange = (value: string) => {
    setTicker(value.trim().toUpperCase());
  };

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
      const res = await fetch(`/api/analyze?${query}`);

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 relative">
      <div className="fixed left-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4 bg-background/50 backdrop-blur-xl p-3 rounded-2xl border border-border/50 shadow-2xl">
        <StockLinks ticker={ticker} />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-border/50 bg-background/50 backdrop-blur-md">
        <TVTickerTape />
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4 relative z-20">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <TickerSearchInput value={ticker} onChange={handleTickerChange} />
          <Button size="icon" variant="outline" className="h-14 w-14 shrink-0 rounded-xl" onClick={() => setShowFinancials(!showFinancials)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </Button>
          <Button size="lg" onClick={fetchStockData} disabled={loading} className="h-14 px-8 rounded-xl shadow-lg shadow-primary/25 cursor-pointer text-md font-semibold transition-all active:scale-95 w-full sm:w-auto">
            {loading ? "Analyzing..." : "Analyze Options"}
          </Button>
        </div>

        {/* Parameters Panel Extracted */}
        {showFinancials && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-background/40 backdrop-blur-xl border border-border/30 rounded-2xl p-6 shadow-inner overflow-hidden">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Analysis Parameters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                 <label className="text-sm font-medium">Investment Term</label>
                 <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value as "short" | "long")}
                  className="w-full h-11 bg-background/50 border border-border/50 rounded-lg px-3 hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="long">Long Term Horizon</option>
                  <option value="short">Short Term Flip</option>
                </select>
              </div>

              <div className="flex items-center h-11 px-4 bg-background/50 border border-border/50 rounded-lg hover:border-primary/50 transition-colors">
                <label className="text-sm font-medium flex items-center gap-3 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={penny}
                    onChange={(e) => setPenny(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Penny Stock Assessment
                </label>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">Target Age (Optional)</label>
                <Input
                  type="number"
                  placeholder="e.g. 35"
                  value={age ?? ""}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="h-11 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">Risk Tolerance</label>
                <Input
                  placeholder="e.g. Aggressive"
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value)}
                  className="h-11 bg-background/50"
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {data && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-10">
          
          {/* Main Chart Column */}
          <div className="xl:col-span-12 w-full">
            <Card className="bg-background/60 backdrop-blur-xl border-white/5 shadow-2xl overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                  <h2 className="font-semibold text-sm tracking-wide">Primary Technical View</h2>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="hover:bg-primary/20 hover:text-primary transition-colors">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="!max-w-none !w-screen !h-screen z-50 bg-background/95 backdrop-blur-2xl rounded-none border-none">
                      <DialogTitle className="sr-only">Fullscreen Chart</DialogTitle>
                      <div className="h-full w-full pt-10">
                        <TVAdvancedChart ticker={ticker} height={height} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="p-2">
                   <TVAdvancedChart ticker={ticker} height={500} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            <Card className="bg-background/60 backdrop-blur-xl border-white/5 shadow-2xl rounded-3xl h-full flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <Tabs defaultValue="rec" className="w-full flex-1 flex flex-col">
                    <TabsList className="grid grid-cols-4 w-full bg-background/50 p-1 rounded-xl mb-6 border border-white/5">
                      <TabsTrigger value="rec" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">💡 Recs</TabsTrigger>
                      <TabsTrigger value="strengths" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">📈 Pros</TabsTrigger>
                      <TabsTrigger value="weaknesses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">📉 Cons</TabsTrigger>
                      <TabsTrigger value="fundamentals" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">🧠 Logic</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-white/5 prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[500px]">
                      <TabsContent value="rec" className="mt-0">
                        <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Final Recommendation</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.recommendation || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="strengths" className="mt-0">
                        <h2 className="text-2xl font-bold mb-4 text-emerald-500">Key Strengths</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.strengths || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="weaknesses" className="mt-0">
                        <h2 className="text-2xl font-bold mb-4 text-rose-500">Risk Factors</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.weaknesses || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="fundamentals" className="mt-0">
                        <h2 className="text-2xl font-bold mb-4 text-blue-500">Fundamental Analysis</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.fundamentals || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                    </div>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-background/60 backdrop-blur-xl border-white/5 shadow-2xl rounded-3xl overflow-hidden h-full">
              <CardContent className="p-0 flex flex-col h-full">
                 <div className="p-6 bg-gradient-to-br from-primary/10 via-background to-background flex-1">
                    <div className="flex justify-between items-end mb-8 border-b border-border/50 pb-6">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Target Assessment</p>
                          <h3 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">{data.scores.final_score} <span className="text-xl text-muted-foreground">/ 100</span></h3>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Sentiment</p>
                           <div className="flex items-center gap-2 font-bold justify-end">
                              <span className="text-emerald-500">{data.news.sentiment_counts.positive || 0}</span> / 
                              <span className="text-slate-500">{data.news.sentiment_counts.neutral || 0}</span> / 
                              <span className="text-rose-500">{data.news.sentiment_counts.negative || 0}</span>
                           </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                           <h4 className="font-semibold border-b border-border/50 pb-2 flex justify-between items-center text-primary">Technicals <span>{data.scores.tech_score}</span></h4>
                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between"><span>RSI Status</span> <span className="font-medium">{data.technical.rsi}</span></div>
                              <div className="flex justify-between"><span>MACD Signal</span> <span className="font-medium">{data.technical.macd}</span></div>
                              <div className="flex justify-between"><span>Trend Zone</span> <span className="font-medium">{data.technical.trend_zone}</span></div>
                              <div className="flex justify-between"><span>Volume Spike</span> <span className="font-medium">{data.technical.volume_spike ? "Detected" : "Normal"}</span></div>
                           </div>
                        </div>
                        
                        <div className="space-y-4">
                           <h4 className="font-semibold border-b border-border/50 pb-2 flex justify-between items-center text-primary">Fundamentals <span>{data.scores.fund_score}</span></h4>
                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between"><span>P/B Ratio</span> <span className="font-medium">{data.fundamentals?.pb?.toFixed(2) ?? "N/A"}</span></div>
                              <div className="flex justify-between"><span>Market Cap</span> <span className="font-medium">{formatMarketCap(data.fundamentals?.market_cap)}</span></div>
                              <div className="flex justify-between"><span>Earn. Growth</span> <span className="font-medium">{data.fundamentals?.earnings_growth ? `${(data.fundamentals.earnings_growth * 100).toFixed(1)}%` : "N/A"}</span></div>
                              <div className="flex justify-between"><span>Trailing P/E</span> <span className="font-medium">{data.fundamentals?.pe?.toFixed(2) ?? "N/A"}</span></div>
                           </div>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
            <div className="bg-background/60 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-2 flex overflow-hidden">
               <div className="w-full scale-[1.02] transform origin-top"><TVTechnicalAnalysis ticker={ticker} height={400} /></div>
            </div>
            <div className="bg-background/60 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-2 flex overflow-hidden">
               <div className="w-full scale-[1.02] transform origin-top"><TVFinancials ticker={ticker} height={400} /></div>
            </div>
            <div className="bg-background/60 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-2 flex overflow-hidden">
               <div className="w-full scale-[1.02] transform origin-top"><TVSymbolProfile ticker={ticker} height={400} /></div>
            </div>
            <div className="bg-background/60 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-2 flex overflow-hidden">
               <div className="w-full scale-[1.02] transform origin-top"><TVTimelineNews ticker={ticker} height={400} /></div>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
