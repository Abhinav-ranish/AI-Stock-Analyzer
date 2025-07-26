# blueprints/fundamentals.py

from flask import Blueprint, request, jsonify
import yfinance as yf
import pandas as pd

fund_bp = Blueprint('fundamentals', __name__, url_prefix='/fundamentals')

@fund_bp.route('/<ticker>')
def get_fundamentals(ticker):
    tkr = yf.Ticker(ticker)
    info = tkr.info
    hist_1y = tkr.history(period='1y')

    # Current price
    price = tkr.fast_info.get('lastPrice') or info.get('currentPrice')

    # Basic
    sector = info.get("sector")
    industry = info.get("industry")

    # Core valuation
    pe          = info.get('trailingPE')
    fpe         = info.get('forwardPE')
    pb          = info.get('priceToBook')
    peg         = info.get('pegRatio')
    div_yield   = info.get('dividendYield')
    market_cap  = info.get('marketCap')
    ps          = info.get('priceToSalesTrailing12Months')
    ev_ebitda   = info.get('enterpriseToEbitda')

    # Profitability & efficiency
    roe         = info.get('returnOnEquity')
    op_margin   = info.get('operatingMargins')
    net_margin  = info.get('netMargins')

    # Debt & liquidity
    debt_eq     = info.get('debtToEquity')
    current_ratio = info.get('currentRatio')

    # Growth
    earnings_g  = info.get('earningsGrowth')
    revenue_g   = info.get('revenueGrowth')
    fcf         = info.get('freeCashflow')

    # Earnings calendar
    calendar = info.get("nextEarningsDate") or info.get("earningsDate")

    # 52‑week range
    low52   = hist_1y['Low'].min()
    high52  = hist_1y['High'].max()

    # Bollinger Bands (20d, ±2σ)
    close   = hist_1y['Close']
    sma20   = close.rolling(20).mean()
    std20   = close.rolling(20).std()
    bb_up   = sma20 + 2*std20
    bb_lo   = sma20 - 2*std20

    # Next resistance
    resistance_30d = hist_1y['High'].tail(30).max()

    return jsonify({
        "sector": sector or 'Unknown',
        "industry": industry or 'Unknown',
        "current_price": round(price, 2) if price else None,

        # Valuation
        "pe": pe,
        "forward_pe": fpe,
        "pb": pb,
        "peg": peg,
        "dividend_yield": div_yield,
        "market_cap": market_cap,
        "price_to_sales": ps,
        "ev_to_ebitda": ev_ebitda,

        # Profitability
        "return_on_equity": roe,
        "operating_margin": op_margin,
        "net_margin": net_margin,

        # Liquidity & Leverage
        "debt_to_equity": debt_eq,
        "current_ratio": current_ratio,

        # Growth
        "earnings_growth": earnings_g,
        "revenue_growth": revenue_g,
        "free_cash_flow": fcf,

        # Technical reference
        "low52": round(low52, 2),
        "high52": round(high52, 2),
        "bb_upper": round(bb_up.iloc[-1], 2),
        "bb_lower": round(bb_lo.iloc[-1], 2),
        "resistance_30d": round(resistance_30d, 2),

        # Earnings date
        "next_earnings": str(calendar) if calendar else None,
    })
