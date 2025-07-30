def normalize(val, vmin, vmax):
    if val is None:
        return 0.5
    return max(0, min(1, (val - vmin) / (vmax - vmin)))

def score_fundamentals(data):
    return sum([
        normalize(data.get('pe'), 0, 100),
        normalize(data.get('pb'), 0, 10),
        normalize(data.get('free_cash_flow'), 0, 1e9),
        normalize(data.get('return_on_equity'), 0, 0.3),
        1 - normalize(data.get('debt_to_equity'), 0, 2)
    ]) / 5

def score_technicals(rsi, vol_spike):
    base = 1 - abs(rsi - 50) / 50
    if vol_spike:
        base += 0.1
    return min(1, base)

def score_insiders(trades):
    score = 0.5
    for t in trades:
        trade_type = t.get("trade_type", "").lower()
        if trade_type == "buy":
            score += 0.1
        elif trade_type == "sell":
            score -= 0.1
    return float(max(0, min(1, score)))

def score_news(counts):
    total = sum(counts.values()) or 1
    score = (counts["positive"] - counts["negative"]) / total
    return (score + 1) / 2

def score_sentiment(sentiment_data: dict) -> float:
    """
    Uses the combined score calculated from:
    - 80% Google Trends volume score
    - 20% News headline sentiment score
    Adjusted for heavy negative sentiment.
    """
    return sentiment_data.get("combined_score", 0.5)
