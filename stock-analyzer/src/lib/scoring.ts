/**
 * Scoring algorithms ported from backend/blueprints/scorer.py
 */

function normalize(val: number | null | undefined, vmin: number, vmax: number): number {
  if (val == null) return 0.5;
  return Math.max(0, Math.min(1, (val - vmin) / (vmax - vmin)));
}

export function scoreFundamentals(data: Record<string, any>): number {
  return (
    (normalize(data.pe, 0, 100) +
      normalize(data.pb, 0, 10) +
      normalize(data.free_cash_flow, 0, 1e9) +
      normalize(data.return_on_equity, 0, 0.3) +
      (1 - normalize(data.debt_to_equity, 0, 2))) /
    5
  );
}

export function scoreTechnicals(rsi: number, volSpike: boolean): number {
  let base = 1 - Math.abs(rsi - 50) / 50;
  if (volSpike) base += 0.1;
  return Math.min(1, base);
}

export function scoreInsiders(
  trades: Array<{ code?: string; trade_type?: string }>
): number {
  let score = 0.5;
  for (const t of trades) {
    const tradeType = (t.trade_type || t.code || "").toLowerCase();
    if (tradeType === "buy" || tradeType === "p") {
      score += 0.1;
    } else if (tradeType === "sell" || tradeType === "s") {
      score -= 0.1;
    }
  }
  return Math.max(0, Math.min(1, score));
}

export function scoreSentiment(sentimentData: {
  positive: number;
  negative: number;
  neutral: number;
}): number {
  const total =
    sentimentData.positive + sentimentData.negative + sentimentData.neutral || 1;
  const raw = (sentimentData.positive - sentimentData.negative) / total;
  return (raw + 1) / 2; // normalize to [0, 1]
}

export function calculateFinalScore(
  scores: { fund: number; tech: number; insider: number; news: number },
  options: { penny: boolean; term: string }
): number {
  if (options.penny) {
    return (
      0.45 * scores.news +
      0.125 * scores.insider +
      0.325 * scores.tech +
      0.1 * scores.fund
    );
  }
  if (options.term === "short") {
    return (
      0.3 * scores.news +
      0.05 * scores.insider +
      0.3 * scores.tech +
      0.35 * scores.fund
    );
  }
  // long term (default)
  return (
    0.15 * scores.news +
    0.02 * scores.insider +
    0.38 * scores.tech +
    0.45 * scores.fund
  );
}
