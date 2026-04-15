import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  try {
    const [summary, chart] = await Promise.all([
      yahooFinance.quoteSummary(ticker.toUpperCase(), {
        modules: [
          "defaultKeyStatistics",
          "financialData",
          "summaryDetail",
          "assetProfile",
          "earningsQuarterlyGrowth",
          "calendarEvents",
        ],
      }) as any,
      yahooFinance.chart(ticker.toUpperCase(), {
        period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        interval: "1d",
      }) as any,
    ]);

    const stats = summary.defaultKeyStatistics || {};
    const fin = summary.financialData || {};
    const detail = summary.summaryDetail || {};
    const profile = summary.assetProfile || {};
    const calendar = summary.calendarEvents || {};

    const quotes: Array<{ open?: number | null; high?: number | null; low?: number | null; close?: number | null; volume?: number | null }> = chart.quotes || [];
    const lows = quotes.map((q) => q.low).filter((v): v is number => v != null);
    const highs = quotes
      .map((q) => q.high)
      .filter((v): v is number => v != null);
    const closes = quotes
      .map((q) => q.close)
      .filter((v): v is number => v != null);

    const low52 = lows.length ? Math.min(...lows) : null;
    const high52 = highs.length ? Math.max(...highs) : null;

    // Bollinger Bands (20d)
    let bbUpper = null;
    let bbLower = null;
    if (closes.length >= 20) {
      const recent20 = closes.slice(-20);
      const sma20 =
        recent20.reduce((a: number, b: number) => a + b, 0) / 20;
      const std20 = Math.sqrt(
        recent20.reduce(
          (sum: number, v: number) => sum + (v - sma20) ** 2,
          0
        ) / 20
      );
      bbUpper = Math.round((sma20 + 2 * std20) * 100) / 100;
      bbLower = Math.round((sma20 - 2 * std20) * 100) / 100;
    }

    // 30-day resistance
    const last30Highs = highs.slice(-30);
    const resistance30d = last30Highs.length ? Math.max(...last30Highs) : null;

    const currentPrice = fin.currentPrice ?? detail.previousClose ?? null;

    return NextResponse.json({
      sector: profile.sector || "Unknown",
      industry: profile.industry || "Unknown",
      current_price: currentPrice
        ? Math.round(currentPrice * 100) / 100
        : null,
      pe: detail.trailingPE ?? null,
      forward_pe: stats.forwardPE ?? detail.forwardPE ?? null,
      pb: stats.priceToBook ?? null,
      peg: stats.pegRatio ?? null,
      dividend_yield: detail.dividendYield ?? null,
      market_cap: detail.marketCap ?? null,
      price_to_sales: detail.priceToSalesTrailing12Months ?? null,
      ev_to_ebitda: stats.enterpriseToEbitda ?? null,
      return_on_equity: fin.returnOnEquity ?? null,
      operating_margin: fin.operatingMargins ?? null,
      net_margin: fin.profitMargins ?? null,
      debt_to_equity: fin.debtToEquity ?? null,
      current_ratio: fin.currentRatio ?? null,
      earnings_growth: fin.earningsGrowth ?? null,
      revenue_growth: fin.revenueGrowth ?? null,
      free_cash_flow: fin.freeCashflow ?? null,
      low52: low52 ? Math.round(low52 * 100) / 100 : null,
      high52: high52 ? Math.round(high52 * 100) / 100 : null,
      bb_upper: bbUpper,
      bb_lower: bbLower,
      resistance_30d: resistance30d
        ? Math.round(resistance30d * 100) / 100
        : null,
      next_earnings: calendar.earningsDate?.[0]
        ? String(calendar.earningsDate[0])
        : null,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error("[FUNDAMENTALS]", e.message);
    return NextResponse.json(
      { error: "Failed to fetch fundamentals" },
      { status: 500 }
    );
  }
}
