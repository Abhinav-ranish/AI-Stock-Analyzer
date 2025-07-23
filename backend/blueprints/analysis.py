# blueprints/analysis.py

from flask import Blueprint, request, jsonify
import os
import yfinance as yf
from blueprints.fundamentals import get_fundamentals as _get_fund_json
from blueprints.insider import get_filtered_insider as _get_insider_json
from blueprints.news import fetch_and_analyze_news
from blueprints.technical import (
    calculate_rsi,
    calculate_macd,
    get_smas,
    trend_zone,
    volume_spike,
    candle_type
)
from groq import Groq
import json
import time

client = Groq()
peer_cache = {}
PEER_CACHE_TTL = 3600

an_bp = Blueprint('analysis', __name__, url_prefix='/analysis')

def get_groq_analysis(prompt: str) -> str:
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_completion_tokens=512,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content

def normalize(val, vmin, vmax):
    if val is None:
        return 0.5
    return max(0, min(1, (val - vmin) / (vmax - vmin)))

def generate_industry_context(sector=None, industry=None) -> str:
    return f"""
When analyzing valuation metrics like PE ratio, consider the industry context:

- For **tech, AI, or high-growth sectors**, a PE ratio around **25–35** is often acceptable.
- For **stable or low-growth sectors** like **healthcare, energy, or retail**, a PE above **25** can signal **overvaluation**.
- Always adjust valuation expectations based on the industry.

This stock's sector is: {sector or 'Unknown'}, industry: {industry or 'Unknown'}.
"""

@an_bp.route('/', methods=['GET'])
def analyze():
    ticker = request.args.get('ticker', '').upper()
    term = request.args.get('term', 'long')
    penny_flag = request.args.get('penny', 'false').lower() == 'true'
    age = request.args.get('age', None)
    risk_profile = request.args.get('risk_profile', '')

    if not ticker:
        return jsonify({"error": "ticker is required"}), 400

    # --- Fundamentals ---
    fund_data = _get_fund_json(ticker).get_json()
    pe_score = normalize(fund_data.get('pe'), 0, 100)
    pb_score = normalize(fund_data.get('pb'), 0, 10)
    fund_score = (pe_score + pb_score) / 2

    sector = fund_data.get("sector")
    industry = fund_data.get("industry")
    context = generate_industry_context(sector, industry)

    # --- Technicals ---
    df = yf.Ticker(ticker).history(period='1y')
    close = df['Close']
    vol = df['Volume']

    rsi_val = calculate_rsi(close)
    macd_val, sig = calculate_macd(close)
    sma50, sma200 = get_smas(close)
    vol_spk = volume_spike(vol)
    tech_score = 1 - abs(rsi_val - 50) / 50
    if vol_spk:
        tech_score += 0.1
    tech_score = min(1, tech_score)

    # --- Insider ---
    insider_trades = _get_insider_json(ticker).get_json()
    insider_score = 0.5
    for t in insider_trades:
        if t.get('trade_type', '').lower() == 'sell':
            insider_score -= 0.1
        else:
            insider_score += 0.1
    insider_score = max(0, min(1, insider_score))

    # --- News ---
    counts, top_stories = fetch_and_analyze_news(ticker)
    total = sum(counts.values()) or 1
    news_score = (counts['positive'] - counts['negative']) / total
    news_score = (news_score + 1) / 2

    # --- Weighted Final Score ---
    if penny_flag:
        final_score = (
            0.45 * news_score +
            0.125 * insider_score +
            0.325 * tech_score +
            0.10 * fund_score
        )
    elif term == 'short':
        final_score = (
            0.30 * news_score +
            0.05 * insider_score +
            0.35 * tech_score +
            0.30 * fund_score
        )
    else:
        final_score = (
            0.15 * news_score +
            0.02 * insider_score +
            0.38 * tech_score +
            0.45 * fund_score
        )

    # --- Peer PE Analysis ---
    def get_cached_peers(ticker):
        now = time.time()
        if ticker in peer_cache:
            ts, peers = peer_cache[ticker]
            if now - ts < PEER_CACHE_TTL:
                print(f"[PEER] Cache HIT for {ticker}")
                return peers
        print(f"[PEER] Cache MISS for {ticker}")
        try:
            peer_prompt = f"Give me 5 stocks similar to {ticker} as a JSON array of short ticker names."
            peer_resp = get_groq_analysis(peer_prompt)
            peers = json.loads(peer_resp)
            peer_cache[ticker] = (now, peers)
            return peers
        except Exception as e:
            print("[PEER] Error getting similar peers:", e)
            return []

    similar_peers = get_cached_peers(ticker)

    peer_pes = []
    for peer in similar_peers:
        if peer == ticker:
            continue
        try:
            peer_fund = _get_fund_json(peer).get_json()
            peer_pe = peer_fund.get("pe")
            if peer_pe:
                peer_pes.append((peer, peer_pe))
        except:
            continue

    peer_avg_pe = sum(pe for _, pe in peer_pes) / len(peer_pes) if peer_pes else None
    peer_pe_comment = (
        f"{ticker} has a PE of {fund_data.get('pe')}, compared to similar peers' average PE of {round(peer_avg_pe, 2)}."
        if peer_avg_pe else ""
    )
    if peer_avg_pe and abs(fund_data.get('pe', 0) - peer_avg_pe) < 3 and news_score < 0.4:
        peer_pe_comment += " However, recent news sentiment is negative, which may impact short-term movement."

    # --- Groq AI Summary ---
    prompt = f"""
    Analyze {ticker}:
    • Fundamental score: {fund_score:.2f}
    • Technical score: {tech_score:.2f}
    • Insider score: {insider_score:.2f}
    • News score: {news_score:.2f}
    • Combined score: {final_score:.2f}
    • Risk profile: {risk_profile}
    • Term: {term}
    • Penny stock: {penny_flag}
    • Age: {age}
    
    {context}
    {peer_pe_comment}

    Provide a concise buy/hold/sell recommendation with 2–3 sentence rationale.
    """
    try:
        ai_resp = get_groq_analysis(prompt)
    except Exception as e:
        ai_resp = f"AI summary unavailable: {e}"

    return jsonify({
        "fundamentals": fund_data,
        "fundamental": {
            "trailing_pe": fund_data.get("pe"),
            "pb_ratio": fund_data.get("pb"),
            "market_cap": fund_data.get("market_cap"),
            "earnings_growth": fund_data.get("earnings_growth"),
            "revenue_growth": fund_data.get("revenue_growth"),
            "fpe": fund_data.get("forward_pe"),
            "trailing_pe": fund_data.get("pe"),
            "pb_ratio": fund_data.get("pb"),
        },
        "technical": {
            "rsi": float(rsi_val),
            "macd": float(macd_val),
            "signal": float(sig),
            "sma_50": float(sma50) if sma50 else None,
            "sma_200": float(sma200) if sma200 else None,

            "trend_zone": trend_zone(close.iloc[-1], sma50, sma200),
            "volume_spike": bool(vol_spk),
            "last_candle": candle_type(df['Open'].iloc[-1], close.iloc[-1])
        },
        "insider_trades": insider_trades,
        "news": {
            "sentiment_counts": counts,
            "top_stories": top_stories
        },
        "scores": {
            "fund_score": round(fund_score, 2),
            "tech_score": round(tech_score, 2),
            "insider_score": round(insider_score, 2),
            "news_score": round(news_score, 2),
            "final_score": round(final_score, 2)
        },
        "ai_analysis": ai_resp
    })
