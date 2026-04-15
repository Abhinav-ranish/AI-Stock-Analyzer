/**
 * Prompt builder ported from backend/blueprints/prompt_builder.py
 */

type Scores = {
  fund: number;
  tech: number;
  insider: number;
  news: number;
  final: number;
};

type Meta = {
  term: string;
  penny: boolean;
  age?: string;
  riskProfile?: string;
};

type Technicals = {
  currentPrice?: number;
  sma50: number;
  sma200: number;
  trendZone: string;
  emaCrossover: string;
  adx: number;
  rsi: number;
  macd: number;
  signal: number;
  stochasticRsi: number;
  volIndex: number;
  squeezeZone: string;
  volumeToday: number;
};

export function buildPrompt(
  ticker: string,
  scores: Scores,
  context: string,
  peerTickers: string[],
  meta: Meta,
  technicals: Technicals
): string {
  const techSection = `
Technical Indicators:
• Current Price: $${technicals.currentPrice ?? "N/A"}
• SMA 50: ${technicals.sma50} | SMA 200: ${technicals.sma200}
• Trend Zone: ${technicals.trendZone}
• EMA Crossover: ${technicals.emaCrossover}
• ADX: ${technicals.adx}
• RSI: ${technicals.rsi}
• MACD: ${technicals.macd} vs Signal: ${technicals.signal}
• Stochastic RSI: ${technicals.stochasticRsi}
• Volatility Index: ${technicals.volIndex} (${technicals.squeezeZone})
• Volume Today: ${technicals.volumeToday}
`;

  const peerComment =
    peerTickers.length > 0
      ? `Similar stocks for context: ${peerTickers.join(", ")}`
      : "";

  return `
You are an equity analyst.

Return your answer in **Markdown**, using ONLY these exact headers and structure (no extras):

## **[Verdict]**   ← e.g. **BUY**, **HOLD**, **STRONG SELL**, etc.

<One blank line>

Start with a well-reasoned paragraph (2-3 lines max) explaining *why* this verdict was chosen — based on:

- Fundamental scores
- Market positioning
- Sentiment
- Financial growth or risks

<Two blank lines>

Then, include a **technical breakdown** (2–4 lines max), explaining:

- RSI
- MACD
- Trend zone (SMA)
- Volume spike
- Bollinger bands

Describe whether each supports or weakens the recommendation.

---

Then include the following headers with similar structure:

## Strengths
- ...

## Weaknesses
- ...

## Fundamentals
- ...

Here is the stock data:
---

Stock: ${ticker}

Scores:
• Fundamentals: ${scores.fund.toFixed(2)}
• Technicals: ${scores.tech.toFixed(2)}
• Insider Activity: ${scores.insider.toFixed(2)}
• Sentiment: ${scores.news.toFixed(2)}
• Final Score: ${scores.final.toFixed(2)}

Meta:
• Term: ${meta.term}
• Penny Stock: ${meta.penny}
• Age: ${meta.age || "N/A"} If investor is young, allow more risk.
• Risk Profile: ${meta.riskProfile || "N/A"}

${context}
${peerComment}

${techSection}
`;
}
