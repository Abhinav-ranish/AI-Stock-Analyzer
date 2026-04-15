import { NextRequest, NextResponse } from "next/server";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const MIN_SHARES = 100_000;
const MIN_VALUE = 1_000_000;

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  if (!FINNHUB_API_KEY) {
    return NextResponse.json({ insider_transactions: [] });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker.toUpperCase()}`,
      {
        headers: { "X-Finnhub-Token": FINNHUB_API_KEY },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ insider_transactions: [] });
    }

    const data = await res.json();
    const transactions = data.data || [];

    const filtered = transactions
      .map((t: any) => {
        const shares = Math.abs(t.change || 0);
        const price = t.transactionPrice || 0;
        const value = shares * price;

        if (shares < MIN_SHARES && value < MIN_VALUE) return null;

        return {
          name: t.name,
          shares_changed: shares,
          price,
          value: Math.round(value * 100) / 100,
          date: t.transactionDate,
          filing_date: t.filingDate,
          code: t.transactionCode,
          symbol: t.symbol,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ insider_transactions: filtered });
  } catch (e: any) {
    console.error("[INSIDER]", e.message);
    return NextResponse.json({ insider_transactions: [] });
  }
}
