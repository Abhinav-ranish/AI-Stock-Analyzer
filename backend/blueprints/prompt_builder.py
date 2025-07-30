def build_prompt(ticker, scores, context, peer_comment, meta, technicals=None, fundamentals=None):
    tech_section = ""
    if technicals:
        tech_section = f"""
Technical Indicators:
• Current Price: ${technicals['current_price']}
• SMA 50: {technicals['sma_50']} | SMA 200: {technicals['sma_200']}
• Trend Zone: {technicals['trend_zone']}
• EMA Crossover: {technicals['ema_crossover']}
• ADX: {technicals['adx']}
• RSI: {technicals['rsi']}
• MACD: {technicals['macd']} vs Signal: {technicals['signal']}
• Stochastic RSI: {technicals['stochastic_rsi']}
• Volatility Index: {technicals['volatility_index']} ({technicals['squeeze_zone']})
• Volume Today: {technicals['volume_today']}
"""

    fund_section = ""
    if fundamentals:
        fund_section = f"""
Fundamental Indicators:
• P/E Ratio: {fundamentals['pe_ratio']}
• P/B Ratio: {fundamentals['pb_ratio']}
• Market Cap: {fundamentals['market_cap']}
• Dividend Yield: {fundamentals['dividend_yield']}
• Revenue Growth: {fundamentals['revenue_growth']}
• Earnings Growth: {fundamentals['earnings_growth']}
• Free Cash Flow: {fundamentals['free_cash_flow']}
• Debt to Equity: {fundamentals['debt_to_equity']}
• Return on Equity: {fundamentals['return_on_equity']}
• 52-Week Low: {fundamentals['low52']}
• 52-Week High: {fundamentals['high52']}
• Bollinger Upper: {fundamentals['bb_upper']}
• Bollinger Lower: {fundamentals['bb_lower']}
• 30-Day Resistance: {fundamentals['resistance_30d']}
• Next Earnings Date: {fundamentals['next_earnings']}

"""

    return f"""
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

Stock: {ticker}

Scores:
• Fundamentals: {float(scores.get('fund', 0)):.2f}
• Technicals: {float(scores.get('tech', 0)):.2f}
• Insider Activity: {float(scores.get('insider', 0)):.2f}
• Sentiment: {float(scores.get('news', 0)):.2f}
• Final Score: {float(scores.get('final', 0)):.2f}

Meta:
• Term: {meta.get('term')}
• Penny Stock: {meta.get('penny_flag')}
• Age: {meta.get('age')} If investor is young, allow more risk.
• Risk Profile: {meta.get('risk_profile')}

{context}
{peer_comment}

{tech_section}
{fund_section}
"""
