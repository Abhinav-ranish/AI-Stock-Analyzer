from flask import Blueprint, request, jsonify
import yfinance as yf
import numpy as np

from blueprints.fundamentals import get_fundamentals as _get_fund_json
from blueprints.insider import fetch_finnhub_insider_data as get_insider_trading
from blueprints.sentiment import fetch_and_analyze_news
from blueprints.technical import (
    calculate_rsi, calculate_macd, get_smas,
    trend_zone, volume_spike, candle_type,
    calculate_volatility_index, stochastic_rsi,
    calculate_adx, ema_crossovers
)
from blueprints.peer_utils import get_cached_peers
from blueprints.prompt_builder import build_prompt
from blueprints.ai_summary import get_groq_analysis
from blueprints.scorer import score_fundamentals, score_sentiment, score_technicals, score_insiders

an_bp = Blueprint("analysis", __name__, url_prefix="/analysis")

def sanitize(obj):

    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize(i) for i in obj]
    elif isinstance(obj, (np.generic, float, int)):
        return round(float(obj), 4)
    elif isinstance(obj, bool):
        return int(obj)  # convert bool to 0/1
    elif obj is None:
        return ""
    return str(obj)


def force_float(v):
    if isinstance(v, (float, int)):
        return round(v, 4)
    if isinstance(v, np.generic):
        return round(float(v), 4)
    return 0.0


@an_bp.route("/", methods=["GET"])
def analyze():
    ticker = request.args.get("ticker", "").upper()
    term = request.args.get("term", "long")
    penny_flag = request.args.get("penny", "false").lower() == "true"
    age = request.args.get("age")
    risk_profile = request.args.get("risk_profile", "")

    # --- Data Fetching ---
    fund = _get_fund_json(ticker).get_json()
    insider_data = get_insider_trading(ticker)
    insider = insider_data.get("insider_transactions", [])
    news_counts, stories = fetch_and_analyze_news(ticker)

    df = yf.Ticker(ticker).history(period="1y")
    if df.empty:
        return jsonify({"error": "No price data"}), 400
    close = df["Close"]
    vol = df["Volume"]

    # --- Technical Indicators ---
    rsi = calculate_rsi(close)
    macd, sig = calculate_macd(close)
    sma50, sma200 = get_smas(close)
    bb_index, is_squeeze = calculate_volatility_index(close)
    stoch_rsi = stochastic_rsi(close)
    adx = calculate_adx(df)
    ema_signal = ema_crossovers(close)
    vol_spk = volume_spike(vol)
    last_candle = candle_type(df["Open"].iloc[-1], close.iloc[-1])

    # --- Scores ---
    scores = {
        "fund": score_fundamentals(fund),
        "tech": score_technicals(rsi, vol_spk),
        "insider": score_insiders(insider),
        "news": score_sentiment(news_counts)
    }

    if penny_flag:
        scores["final"] = 0.45 * scores["news"] + 0.125 * scores["insider"] + 0.325 * scores["tech"] + 0.1 * scores["fund"]
    elif term == "short":
        scores["final"] = 0.3 * scores["news"] + 0.05 * scores["insider"] + 0.3 * scores["tech"] + 0.35 * scores["fund"]
    else:
        scores["final"] = 0.15 * scores["news"] + 0.02 * scores["insider"] + 0.38 * scores["tech"] + 0.45 * scores["fund"]

    scores_clean = {
        "fund_score": force_float(scores["fund"]),
        "tech_score": force_float(scores["tech"]),
        "news_score": force_float(scores["news"]),
        "insider_score": force_float(scores["insider"]),
        "final_score": force_float(scores["final"]),
    }

    # --- Prompt & AI Summary ---
    context = f"This stock's sector is {fund.get('sector')}, industry: {fund.get('industry')}."
    peer_comment = get_cached_peers(ticker)

    technicals = {
        "current_price": fund.get("current_price"),
        "sma_50": sma50,
        "sma_200": sma200,
        "trend_zone": trend_zone(close.iloc[-1], sma50, sma200),
        "ema_crossover": ema_signal,
        "adx": adx,
        "rsi": rsi,
        "macd": macd,
        "signal": sig,
        "stochastic_rsi": stoch_rsi,
        "volatility_index": bb_index,
        "squeeze_zone": "Compression" if is_squeeze else "Expansion",
        "volume_today": int(vol.iloc[-1]),
    }

    prompt = build_prompt(
        ticker, scores, context, peer_comment,
        {
            "term": term,
            "penny_flag": penny_flag,
            "age": age,
            "risk_profile": risk_profile
        },
        technicals=technicals
    )

    summary = get_groq_analysis(prompt)

    response = {
        "scores": scores_clean,
        "fundamentals": fund,
        "insider_trades": insider,
        "news": {
            "sentiment_counts": news_counts,
            "top_stories": stories
        },
        "technical": {
            "rsi": rsi,
            "macd": macd,
            "signal": sig,
            "sma_50": sma50,
            "sma_200": sma200,
            "trend_zone": trend_zone(close.iloc[-1], sma50, sma200),
            "volume_spike": vol_spk,
            "last_candle": last_candle,
            "volatility_index": bb_index,
            "squeeze_zone": "Compression" if is_squeeze else "Expansion",
            "stochastic_rsi": stoch_rsi,
            "adx": adx,
            "ema_crossover": ema_signal
        },
        "ai_analysis": summary
    }

    return jsonify(sanitize(response))
