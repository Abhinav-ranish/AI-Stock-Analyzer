# blueprints/fundamentals.py

from flask import Blueprint, request, jsonify
import yfinance as yf
import pandas as pd

fund_bp = Blueprint('fundamentals', __name__, url_prefix='/fundamentals')

@fund_bp.route('/<ticker>')
def get_fundamentals(ticker):
    tkr = yf.Ticker(ticker)
    info = tkr.info
    
    # Basic company info
    sector = info.get("sector")         # e.g., "Technology"
    industry = info.get("industry")     # e.g., "Consumer Electronics

    # Core valuation metrics
    pe          = info.get('trailingPE')
    fpe         = info.get('forwardPE')
    pb          = info.get('priceToBook')
    peg         = info.get('pegRatio')
    div_yield   = info.get('dividendYield')  # expressed as a decimal, e.g. 0.02 for 2%
    market_cap  = info.get('marketCap')

    # Growth metrics
    earnings_g  = info.get('earningsGrowth')
    revenue_g   = info.get('revenueGrowth')

    # 52‑week range
    hist_1y = tkr.history(period='1y')
    low52   = hist_1y['Low'].min()
    high52  = hist_1y['High'].max()

    # Bollinger Bands (20d, ±2σ)
    close   = hist_1y['Close']
    sma20   = close.rolling(20).mean()
    std20   = close.rolling(20).std()
    bb_up   = sma20 + 2*std20
    bb_lo   = sma20 - 2*std20

    # Next resistance: max high over past 30 days
    resistance_30d = hist_1y['High'].tail(30).max()

    return jsonify({
        "sector": sector or 'Unknown',
        "industry": industry or 'Unknown',

        # Valuation
        'pe': pe,
        'forward_pe': fpe,
        'pb': pb,
        'peg': peg,
        'dividend_yield': div_yield,
        'market_cap': market_cap,

        # Growth
        'earnings_growth': earnings_g,
        'revenue_growth': revenue_g,

        # 52‑week Stats
        'low52': round(low52,2),
        'high52': round(high52,2),

        # Bollinger
        'bb_upper': round(bb_up.iloc[-1],2),
        'bb_lower': round(bb_lo.iloc[-1],2),

        # Technical resistance
        'resistance_30d': round(resistance_30d,2)
    })
