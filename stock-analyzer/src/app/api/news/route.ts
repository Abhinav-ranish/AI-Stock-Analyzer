import { NextRequest, NextResponse } from "next/server";

const NEWS_API_KEY = process.env.NEWSAPI_KEY;
const NEWS_API_URL = "https://newsapi.org/v2/everything";

const TRUSTED_DOMAINS = new Set([
  "reuters.com",
  "bloomberg.com",
  "ft.com",
  "bbc.com",
  "wsj.com",
  "marketwatch.com",
  "barrons.com",
  "cnbc.com",
  "seekingalpha.com",
  "finance.yahoo.com",
]);

// Simple financial sentiment words (replaces TextBlob)
const POSITIVE_WORDS = new Set([
  "surge", "soar", "rally", "gain", "rise", "jump", "boost", "profit",
  "growth", "beat", "exceed", "upgrade", "bullish", "record", "high",
  "strong", "positive", "outperform", "breakout", "recovery", "upside",
]);
const NEGATIVE_WORDS = new Set([
  "fall", "drop", "plunge", "crash", "decline", "loss", "miss", "cut",
  "downgrade", "bearish", "low", "weak", "negative", "underperform",
  "risk", "warning", "debt", "layoff", "lawsuit", "fraud", "selloff",
]);

function analyzeSentiment(title: string): {
  sentiment: "positive" | "negative" | "neutral";
  polarity: number;
} {
  const words = title.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) score += 1;
    if (NEGATIVE_WORDS.has(w)) score -= 1;
  }
  const polarity = Math.max(-1, Math.min(1, score / 3));
  const sentiment =
    polarity > 0.1 ? "positive" : polarity < -0.1 ? "negative" : "neutral";
  return { sentiment, polarity: Math.round(polarity * 1000) / 1000 };
}

function isReputable(url: string): boolean {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return TRUSTED_DOMAINS.has(domain);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  if (!NEWS_API_KEY) {
    return NextResponse.json({
      sentiment_counts: { positive: 0, negative: 0, neutral: 0 },
      top_stories: [],
    });
  }

  try {
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const params = new URLSearchParams({
      q: `${ticker} stock`,
      apiKey: NEWS_API_KEY,
      language: "en",
      from: fromDate,
      sortBy: "publishedAt",
      pageSize: "50",
    });

    const res = await fetch(`${NEWS_API_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        sentiment_counts: { positive: 0, negative: 0, neutral: 0 },
        top_stories: [],
      });
    }

    const data = await res.json();
    const articles = data.articles || [];
    const counts = { positive: 0, negative: 0, neutral: 0 };
    const trusted: any[] = [];
    const fallback: any[] = [];
    const seenTitles = new Set<string>();

    for (const article of articles) {
      const title = article.title || "";
      const url = article.url || "";
      if (!title || seenTitles.has(title)) continue;
      seenTitles.add(title);

      const { sentiment, polarity } = analyzeSentiment(title);
      const entry = {
        title,
        url,
        source: article.source?.name || "",
        publishedAt: article.publishedAt,
        sentiment,
        polarity,
      };

      if (isReputable(url)) {
        trusted.push(entry);
        counts[sentiment]++;
      } else {
        fallback.push(entry);
      }
    }

    const finalArticles = (trusted.length ? trusted : fallback)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 5);

    return NextResponse.json({
      sentiment_counts: counts,
      top_stories: finalArticles,
    });
  } catch (e: any) {
    console.error("[NEWS]", e.message);
    return NextResponse.json({
      sentiment_counts: { positive: 0, negative: 0, neutral: 0 },
      top_stories: [],
    });
  }
}
