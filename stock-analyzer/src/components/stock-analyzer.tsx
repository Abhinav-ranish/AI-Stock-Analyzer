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
  DialogHeader,
} from "@/components/ui/dialog";
import StockLinks from "./stock-links";
import TVAdvancedChart from "./trading-view";
import { Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import TradingViewWidgetSMA from "./charts/SMAindex";
import { toast } from "sonner";
import TVTimelineNews from "./charts/TVTimelineNews";
import CustomTickerTape from "./CustomTickerTape";
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
    enterprise_value?: number;
    ev_ebitda?: number;
    ps?: number;
    pcf?: number;
    pfcf?: number;
    earnings_growth?: number;
    revenue_growth?: number;
    operating_margin?: number;
    gross_margin?: number;
    net_margin?: number;
    operating_cash_flow?: number;
    free_cash_flow?: number;
    fpe?: number;
  };
  news: {
    sentiment_counts: Record<string, number>;
    top_stories: { title: string; url: string; source: string; sentiment: string }[];
  };
  insider_trades?: any[];
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

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-border/50 bg-background/50">
        <CustomTickerTape />
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

        </motion.div>

        {showFinancials && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-muted/30 backdrop-blur-md border border-border/50 rounded-xl p-5 shadow-sm overflow-hidden mb-8">
            <h3 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-widest">Analysis Parameters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Investment Term</label>
                 <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value as "short" | "long")}
                  className="w-full h-10 bg-background/80 border border-border/50 rounded-md px-3 text-sm hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                >
                  <option value="long">Long Term Horizon</option>
                  <option value="short">Short Term Flip</option>
                </select>
              </div>

              <div className="flex items-center h-10 px-4 bg-background/80 border border-border/50 rounded-md hover:border-primary/50 transition-colors shadow-sm">
                <label className="text-sm font-medium flex items-center gap-3 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={penny}
                    onChange={(e) => setPenny(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Penny Stock Scrape
                </label>
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Target Age</label>
                <Input
                  type="number"
                  placeholder="e.g. 35"
                  value={age ?? ""}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="h-10 bg-background/80 text-sm shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Risk Tolerance</label>
                <Input
                  placeholder="e.g. Aggressive"
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value)}
                  className="h-10 bg-background/80 text-sm shadow-sm"
                />
              </div>
            </div>
          </motion.div>
        )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          
          {/* Left Column: Primary Charts and Grids */}
          <div className="xl:col-span-8 w-full flex flex-col gap-6">
            <Card className="bg-background border-border/50 shadow-sm overflow-hidden rounded-xl relative group w-full">
              <CardContent className="p-1">
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-md bg-background/50 hover:bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground shadow-sm transition-all">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="!max-w-none !w-screen !h-screen z-50 bg-background/95 backdrop-blur-xl rounded-none border-none p-0">
                      <DialogTitle className="sr-only">Fullscreen Chart</DialogTitle>
                      <div className="h-full w-full pt-10">
                        <TVAdvancedChart ticker={ticker} height={height} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <TVAdvancedChart ticker={ticker} height={750} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-2">
              <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden hidden xl:block">
                 <div className="w-full h-full flex"><TVTechnicalAnalysis ticker={ticker} height={400} /></div>
              </div>
              <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden hidden xl:block">
                 <div className="w-full h-full flex"><TVFinancials ticker={ticker} height={400} /></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
                 <div className="w-full flex"><TVSymbolProfile ticker={ticker} height={400} /></div>
              </div>
              <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-[400px]">
                 <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                   <h2 className="font-bold text-xs tracking-widest uppercase">Top Stories</h2>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{data.news.top_stories.length} Articles</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {data.news.top_stories.length > 0 ? (
                      <ul className="divide-y divide-border/30">
                        {data.news.top_stories.map((story: any, idx: number) => (
                          <li key={idx} className="p-4 hover:bg-muted/30 transition-colors group">
                             <a href={story.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-2.5">
                               <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold text-primary/80 uppercase truncate max-w-[150px]" title={story.source}>{story.source}</span>
                                 <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                                    story.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                    story.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                 }`}>{story.sentiment}</span>
                               </div>
                               <h3 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors text-foreground/90">{story.title}</h3>
                             </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic tracking-wide">No recent stories found.</div>
                    )}
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Verdict and Global Scores */}
          <div className="xl:col-span-4 w-full flex flex-col gap-6">
            <Card className="bg-background border-border/50 shadow-sm rounded-xl overflow-hidden w-full">
              <CardContent className="p-0 flex flex-col h-full bg-muted/10">
                 <div className="p-6 flex-1">
                    <div className="flex justify-between items-start border-b border-border/50 pb-5 mb-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Score</span>
                          <span className="text-4xl font-black text-foreground mt-1">{data.scores.final_score} <span className="text-lg font-normal text-muted-foreground">/ 100</span></span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sentiment</span>
                           <div className="flex items-center gap-1.5 font-bold justify-end mt-1.5 text-sm bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                              <span className="text-emerald-500">{data.news.sentiment_counts.positive || 0}</span>
                              <span className="text-muted-foreground font-normal">|</span>
                              <span className="text-slate-500">{data.news.sentiment_counts.neutral || 0}</span>
                              <span className="text-muted-foreground font-normal">|</span>
                              <span className="text-rose-500">{data.news.sentiment_counts.negative || 0}</span>
                           </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6 flex-1">
                        <div className="space-y-3">
                           <div className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border border-border/50">
                             <span>Technicals</span>
                             <span className="text-primary">{(data.scores.tech_score * 100).toFixed(1)}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-y-3 gap-x-4 px-2 text-xs">
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">RSI Status</span> <span className="font-bold">{data.technical.rsi}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">MACD Signal</span> <span className="font-bold">{data.technical.macd}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">Trend Zone</span> <span className="font-bold truncate" title={data.technical.trend_zone}>{data.technical.trend_zone}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">Volume Spike</span> <span className="font-bold">{data.technical.volume_spike ? "Detected" : "Normal"}</span></div>
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <div className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border border-border/50">
                             <span>Fundamentals</span>
                             <span className="text-primary">{(data.scores.fund_score * 100).toFixed(1)}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-y-3 gap-x-4 px-2 text-xs">
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">P/B Ratio</span> <span className="font-bold">{data.fundamentals?.pb?.toFixed(2) ?? "N/A"}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">Market Cap</span> <span className="font-bold">{formatMarketCap(data.fundamentals?.market_cap)}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">Earn. Growth</span> <span className="font-bold">{data.fundamentals?.earnings_growth ? `${(data.fundamentals.earnings_growth * 100).toFixed(1)}%` : "N/A"}</span></div>
                              <div className="flex flex-col gap-1 border-b border-border/50 pb-2"><span className="text-muted-foreground font-medium">Trailing P/E</span> <span className="font-bold">{data.fundamentals?.pe?.toFixed(2) ?? "N/A"}</span></div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between items-center bg-muted/30 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border border-border/50">
                             <span>Insider Activity</span>
                             <span className="text-primary">{data.scores.insider_score != null ? (data.scores.insider_score * 100).toFixed(0) : "0"} <span className="text-[10px] text-muted-foreground font-normal">/ 100</span></span>
                           </div>
                           <div className="px-2 text-xs">
                              {data.insider_trades && data.insider_trades.length > 0 ? (
                                 <div className="space-y-3">
                                   <ul className="space-y-2">
                                     {data.insider_trades.slice(0, 3).map((t: any, i: number) => (
                                        <li key={i} className="flex justify-between items-center border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                          <span className="truncate max-w-[120px] font-medium" title={t.name}>{t.name}</span>
                                          <div className="text-right">
                                             <span className={t.shares_changed > 0 ? 'text-emerald-500 font-bold block leading-none' : 'text-rose-500 font-bold block leading-none'}>{t.shares_changed > 0 ? '+' : ''}{t.shares_changed.toLocaleString()}</span>
                                             <span className="text-[10px] text-muted-foreground">${(t.value / 1000).toFixed(0)}k</span>
                                          </div>
                                        </li>
                                     ))}
                                   </ul>
                                   {data.insider_trades.length > 3 && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                           <Button variant="outline" size="sm" className="w-full text-[10px] h-7 uppercase tracking-wider bg-background/50 hover:bg-muted">View All {data.insider_trades.length} Trades</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border border-border/50">
                                           <DialogHeader className="pb-3 border-b border-border/50">
                                              <DialogTitle className="text-sm font-bold uppercase tracking-widest text-primary">Full Insider Activity</DialogTitle>
                                           </DialogHeader>
                                           <div className="overflow-y-auto px-1 py-2 flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                             <ul className="space-y-3">
                                               {data.insider_trades.map((t: any, i: number) => (
                                                  <li key={i} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0">
                                                    <div className="flex flex-col">
                                                      <span className="font-bold text-sm text-foreground/90" title={t.name}>{t.name}</span>
                                                      <span className="text-[10px] text-muted-foreground uppercase mt-0.5">{t.date} | Code: {t.code}</span>
                                                    </div>
                                                    <div className="text-right">
                                                       <span className={t.shares_changed > 0 ? 'text-emerald-500 font-bold block text-sm' : 'text-rose-500 font-bold block text-sm'}>{t.shares_changed > 0 ? '+' : ''}{t.shares_changed.toLocaleString()}</span>
                                                       <span className="text-xs text-muted-foreground">${(t.value / 1000).toFixed(0)}k Value</span>
                                                    </div>
                                                  </li>
                                               ))}
                                             </ul>
                                           </div>
                                        </DialogContent>
                                      </Dialog>
                                   )}
                                 </div>
                              ) : <span className="text-muted-foreground italic tracking-wide">No recent significant activity</span>}
                           </div>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-border/50 shadow-sm rounded-xl flex-1 flex flex-col w-full">
              <CardContent className="p-5 flex-1 flex flex-col">
                <Tabs defaultValue="rec" className="w-full min-h-[400px] flex flex-col">
                    <TabsList className="grid grid-cols-4 w-full bg-muted/40 p-1 rounded-md mb-5 border border-border/30">
                      <TabsTrigger value="rec" className="rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium transition-all">Report</TabsTrigger>
                      <TabsTrigger value="strengths" className="rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium transition-all">Bull</TabsTrigger>
                      <TabsTrigger value="weaknesses" className="rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium transition-all">Bear</TabsTrigger>
                      <TabsTrigger value="fundamentals" className="rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm font-medium transition-all">Mkt</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 bg-muted/20 rounded-md p-5 border border-border/30 prose prose-sm dark:prose-invert max-w-none overflow-y-auto w-full text-foreground/90">
                      <TabsContent value="rec" className="mt-0">
                        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide">Analyst Verdict</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.recommendation || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="strengths" className="mt-0">
                        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Bull Case</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.strengths || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="weaknesses" className="mt-0">
                        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide text-rose-600 dark:text-rose-400">Bear Case</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.weaknesses || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                      <TabsContent value="fundamentals" className="mt-0">
                        <h2 className="text-xl font-bold mb-3 uppercase tracking-wide text-blue-600 dark:text-blue-400">Core Fundamentals</h2>
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{sections.fundamentals || "_No data generated._"}</ReactMarkdown>
                      </TabsContent>
                    </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

        </motion.div>
      )}
    </div>
  );
}
