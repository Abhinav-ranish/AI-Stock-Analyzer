import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import {
  calculateRSI,
  calculateMACD,
  getSMAs,
  emaCrossovers,
  stochasticRSI,
  calculateADX,
  calculateVolatilityIndex,
  trendZone,
  volumeSpike,
  candleType,
} from "@/lib/indicators";
import {
  scoreFundamentals,
  scoreTechnicals,
  scoreInsiders,
  scoreSentiment,
  calculateFinalScore,
} from "@/lib/scoring";
import { buildPrompt } from "@/lib/prompt";
import { getGeminiAnalysis } from "@/lib/gemini";
import { upsertAndFindPeers } from "@/lib/embeddings";

function round(v: number, d = 4): number {
  return Math.round(v * 10 ** d) / 10 ** d;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ticker = params.get("ticker")?.toUpperCase();
  const term = params.get("term") || "long";
  const penny = params.get("penny") === "true";
  const age = params.get("age") || undefined;
  const riskProfile = params.get("risk_profile") || undefined;

  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  try {
    // Fetch all data in parallel
    const [chartData, summaryData, insiderRes, newsRes] = await Promise.all([
      yahooFinance.chart(ticker, {
        period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        interval: "1d",
      }) as any,
      yahooFinance.quoteSummary(ticker, {
        modules: [
          "defaultKeyStatistics",
          "financialData",
          "summaryDetail",
          "assetProfile",
        ],
      }) as any,
      fetchInsider(ticker),
      fetchNews(ticker),
    ]);

    const quotes: Array<{
      open?: number | null;
      high?: number | null;
      low?: number | null;
      close?: number | null;
      volume?: number | null;
    }> = chartData.quotes || [];
    if (quotes.length === 0) {
      return NextResponse.json({ error: "No price data" }, { status: 400 });
    }

    const closes = quotes
      .map((q) => q.close)
      .filter((v): v is number => v != null);
    const volumes = quotes
      .map((q) => q.volume)
      .filter((v): v is number => v != null);
    const highs = quotes
      .map((q) => q.high)
      .filter((v): v is number => v != null);
    const lows = quotes
      .map((q) => q.low)
      .filter((v): v is number => v != null);
    const opens = quotes
      .map((q) => q.open)
      .filter((v): v is number => v != null);

    // Technical indicators
    const rsi = calculateRSI(closes);
    const { macd, signal } = calculateMACD(closes);
    const { sma50, sma200 } = getSMAs(closes);
    const { volIndex, isSqueeze } = calculateVolatilityIndex(closes);
    const stochRsi = stochasticRSI(closes);
    const adx = calculateADX(highs, lows, closes);
    const emaSignal = emaCrossovers(closes);
    const volSpk = volumeSpike(volumes);
    const lastCandle = candleType(
      opens[opens.length - 1],
      closes[closes.length - 1]
    );
    const zone = trendZone(closes[closes.length - 1], sma50, sma200);

    // Fundamentals
    const stats = summaryData.defaultKeyStatistics || {};
    const fin = summaryData.financialData || {};
    const detail = summaryData.summaryDetail || {};
    const profile = summaryData.assetProfile || {};

    const fund = {
      sector: profile.sector || "Unknown",
      industry: profile.industry || "Unknown",
      current_price: fin.currentPrice ?? detail.previousClose ?? null,
      pe: detail.trailingPE ?? null,
      forward_pe: stats.forwardPE ?? detail.forwardPE ?? null,
      pb: stats.priceToBook ?? null,
      market_cap: detail.marketCap ?? null,
      earnings_growth: fin.earningsGrowth ?? null,
      revenue_growth: fin.revenueGrowth ?? null,
      return_on_equity: fin.returnOnEquity ?? null,
      debt_to_equity: fin.debtToEquity ?? null,
      free_cash_flow: fin.freeCashflow ?? null,
    };

    // Insider data
    const insiderTrades = insiderRes.insider_transactions || [];

    // News/sentiment
    const newsCounts = newsRes.sentiment_counts || {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    // Scores
    const scores = {
      fund: scoreFundamentals(fund),
      tech: scoreTechnicals(rsi, volSpk),
      insider: scoreInsiders(insiderTrades),
      news: scoreSentiment(newsCounts),
      final: 0,
    };
    scores.final = calculateFinalScore(scores, { penny, term });

    // Build prompt and get AI analysis
    const context = `This stock's sector is ${fund.sector}, industry: ${fund.industry}.`;

    const technicals = {
      currentPrice: fund.current_price,
      sma50,
      sma200,
      trendZone: zone,
      emaCrossover: emaSignal,
      adx,
      rsi,
      macd,
      signal,
      stochasticRsi: stochRsi,
      volIndex,
      squeezeZone: isSqueeze ? "Compression" : "Expansion",
      volumeToday: volumes[volumes.length - 1] || 0,
    };

    // Find similar stocks via vector embeddings (pgvector)
    const peerTickers = await upsertAndFindPeers({
      ticker,
      sector: fund.sector,
      industry: fund.industry,
      pe: fund.pe,
      forward_pe: fund.forward_pe,
      pb: fund.pb,
      market_cap: fund.market_cap,
      earnings_growth: fund.earnings_growth,
      revenue_growth: fund.revenue_growth,
      return_on_equity: fund.return_on_equity,
      debt_to_equity: fund.debt_to_equity,
    });

    const prompt = buildPrompt(
      ticker,
      scores,
      context,
      peerTickers,
      { term, penny, age, riskProfile },
      technicals
    );

    const summary = await getGeminiAnalysis(prompt);

    return NextResponse.json({
      ticker,
      scores: {
        fund_score: round(scores.fund),
        tech_score: round(scores.tech),
        news_score: round(scores.news),
        insider_score: round(scores.insider),
        final_score: round(scores.final),
      },
      fundamentals: fund,
      insider_trades: insiderTrades,
      news: {
        sentiment_counts: newsCounts,
        top_stories: newsRes.top_stories || [],
      },
      technical: {
        rsi,
        macd,
        signal,
        sma_50: sma50,
        sma_200: sma200,
        trend_zone: zone,
        volume_spike: volSpk,
        last_candle: lastCandle,
        volatility_index: volIndex,
        squeeze_zone: isSqueeze ? "Compression" : "Expansion",
        stochastic_rsi: stochRsi,
        adx,
        ema_crossover: emaSignal,
      },
      peer_tickers: peerTickers,
      ai_analysis: summary,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error("[ANALYZE]", e);
    return NextResponse.json(
      { error: e.message || "Analysis failed" },
      { status: 500 }
    );
  }
}

// Internal fetchers that call sibling routes' logic inline
async function fetchInsider(
  ticker: string
): Promise<{ insider_transactions: any[] }> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { insider_transactions: [] };

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}`,
      {
        headers: { "X-Finnhub-Token": apiKey },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return { insider_transactions: [] };
    const data = await res.json();

    const filtered = (data.data || [])
      .map((t: any) => {
        const shares = Math.abs(t.change || 0);
        const price = t.transactionPrice || 0;
        const value = shares * price;
        if (shares < 100_000 && value < 1_000_000) return null;
        return {
          name: t.name,
          shares_changed: shares,
          price,
          value: Math.round(value * 100) / 100,
          date: t.transactionDate,
          code: t.transactionCode,
        };
      })
      .filter(Boolean);

    return { insider_transactions: filtered };
  } catch {
    return { insider_transactions: [] };
  }
}

async function fetchNews(
  ticker: string
): Promise<{
  sentiment_counts: { positive: number; negative: number; neutral: number };
  top_stories: any[];
}> {
  const apiKey = process.env.NEWSAPI_KEY;
  const fallback = {
    sentiment_counts: { positive: 0, negative: 0, neutral: 0 },
    top_stories: [],
  };
  if (!apiKey) return fallback;

  const POSITIVE = new Set([
    "surge", "soar", "rally", "gain", "rise", "jump", "boost", "profit",
    "growth", "beat", "exceed", "upgrade", "bullish", "record", "strong",
    "positive", "outperform", "breakout", "recovery", "upside",
  ]);
  const NEGATIVE = new Set([
    "fall", "drop", "plunge", "crash", "decline", "loss", "miss", "cut",
    "downgrade", "bearish", "weak", "negative", "underperform", "risk",
    "warning", "debt", "layoff", "lawsuit", "fraud", "selloff",
  ]);

  try {
    const fromDate = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];
    const params = new URLSearchParams({
      q: `${ticker} stock`,
      apiKey,
      language: "en",
      from: fromDate,
      sortBy: "publishedAt",
      pageSize: "50",
    });

    const res = await fetch(
      `https://newsapi.org/v2/everything?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return fallback;

    const data = await res.json();
    const counts = { positive: 0, negative: 0, neutral: 0 };
    const stories: any[] = [];
    const seen = new Set<string>();

    for (const a of data.articles || []) {
      const title = a.title || "";
      if (!title || seen.has(title)) continue;
      seen.add(title);

      const words = title.toLowerCase().split(/\W+/);
      let score = 0;
      for (const w of words) {
        if (POSITIVE.has(w)) score++;
        if (NEGATIVE.has(w)) score--;
      }
      const sentiment: "positive" | "negative" | "neutral" =
        score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
      counts[sentiment]++;
      stories.push({ title, url: a.url, source: a.source?.name, sentiment });
    }

    return {
      sentiment_counts: counts,
      top_stories: stories.slice(0, 5),
    };
  } catch {
    return fallback;
  }
}
