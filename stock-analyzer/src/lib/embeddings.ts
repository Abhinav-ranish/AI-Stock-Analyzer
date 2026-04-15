import { getSupabase } from "./supabase";

import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

type StockProfile = {
  ticker: string;
  sector: string;
  industry: string;
  pe: number | null;
  forward_pe: number | null;
  pb: number | null;
  market_cap: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  return_on_equity: number | null;
  debt_to_equity: number | null;
};

function buildEmbeddingText(profile: StockProfile): string {
  const mcap = profile.market_cap
    ? profile.market_cap >= 1e9
      ? `$${(profile.market_cap / 1e9).toFixed(1)}B`
      : `$${(profile.market_cap / 1e6).toFixed(0)}M`
    : "unknown";

  return [
    `${profile.ticker} is a ${profile.sector} company in the ${profile.industry} industry.`,
    `Market cap: ${mcap}.`,
    profile.pe ? `P/E ratio: ${profile.pe.toFixed(1)}.` : "",
    profile.forward_pe
      ? `Forward P/E: ${profile.forward_pe.toFixed(1)}.`
      : "",
    profile.pb ? `Price-to-book: ${profile.pb.toFixed(2)}.` : "",
    profile.earnings_growth
      ? `Earnings growth: ${(profile.earnings_growth * 100).toFixed(1)}%.`
      : "",
    profile.revenue_growth
      ? `Revenue growth: ${(profile.revenue_growth * 100).toFixed(1)}%.`
      : "",
    profile.return_on_equity
      ? `ROE: ${(profile.return_on_equity * 100).toFixed(1)}%.`
      : "",
    profile.debt_to_equity
      ? `Debt-to-equity: ${profile.debt_to_equity.toFixed(1)}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function getEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({
    model: "text-embedding-004",
  });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Upsert a stock's embedding into Supabase and return similar stocks.
 * Gracefully returns empty array if Supabase is not configured or table doesn't exist.
 */
export async function upsertAndFindPeers(
  profile: StockProfile,
  limit = 5
): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const text = buildEmbeddingText(profile);
    const embedding = await getEmbedding(text);

    // Upsert this stock's embedding
    await supabase.from("stock_embeddings").upsert(
      {
        ticker: profile.ticker,
        embedding: JSON.stringify(embedding),
        metadata: {
          sector: profile.sector,
          industry: profile.industry,
          market_cap: profile.market_cap,
          updated_at: new Date().toISOString(),
        },
      },
      { onConflict: "ticker" }
    );

    // Find similar stocks (excluding self)
    const { data, error } = await supabase.rpc("match_stocks", {
      query_embedding: JSON.stringify(embedding),
      match_count: limit + 1,
    });

    if (error || !data) return [];

    return data
      .filter((row: { ticker: string }) => row.ticker !== profile.ticker)
      .slice(0, limit)
      .map((row: { ticker: string }) => row.ticker);
  } catch (e) {
    console.error("[EMBEDDINGS]", e);
    return [];
  }
}
