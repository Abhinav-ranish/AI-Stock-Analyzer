# blueprints/technical.py

from flask import Blueprint, jsonify
import yfinance as yf
import pandas as pd

tech_bp = Blueprint('technical', __name__, url_prefix='/technical')

def calculate_rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = -delta.clip(upper=0).rolling(period).mean()
    rs    = gain / loss
    return round(100 - (100 / (1 + rs)).iloc[-1], 2)

def calculate_macd(series: pd.Series):
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd  = ema12 - ema26
    signal= macd.ewm(span=9, adjust=False).mean()
    return round(macd.iloc[-1],2), round(signal.iloc[-1],2)

def get_smas(series: pd.Series):
    sma50  = series.rolling(50).mean().iloc[-1]
    sma200 = series.rolling(200).mean().iloc[-1]
    return round(sma50,2), round(sma200,2)

def trend_zone(close: float, sma50: float, sma200: float) -> str:
    if close > sma50 > sma200:
        return "Strong Bull"
    if close > sma200 and close < sma50:
        return "Bull with Pullback"
    if close < sma200:
        return "Bear"
    return "Neutral"

def volume_spike(volumes: pd.Series, factor: float = 2.0) -> bool:
    avg20 = volumes.rolling(20).mean().iloc[-1]
    today = volumes.iloc[-1]
    return today >= factor * avg20

def candle_type(open_p, close_p) -> str:
    return "Bullish" if close_p > open_p else "Bearish"

@tech_bp.route('/<ticker>')
def get_technical(ticker):
    # fetch 1y daily
    df = yf.Ticker(ticker).history(period='1y')
    if df.empty:
        return jsonify({"error": "No data"}), 400

    close = df['Close']
    vol   = df['Volume']

    # Indicators
    rsi_val       = calculate_rsi(close)
    macd_val, sig = calculate_macd(close)
    sma50_val, sma200_val = get_smas(close)
    zone          = trend_zone(close.iloc[-1], sma50_val, sma200_val)
    vol_spike     = volume_spike(vol)
    candle        = candle_type(df['Open'].iloc[-1], close.iloc[-1])

    return jsonify({
        "rsi": float(rsi_val),
        "macd": float(macd_val),
        "signal": float(sig),
        "sma_50": float(sma50_val),
        "sma_200": float(sma200_val),
        "trend_zone": str(zone),
        "volume_today": int(vol.iloc[-1]),
        "avg_volume_20": int(vol.rolling(20).mean().iloc[-1]),
        "volume_spike": bool(vol_spike),
        "last_candle": str(candle)
})

