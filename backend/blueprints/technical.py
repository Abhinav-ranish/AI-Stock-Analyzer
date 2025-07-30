# blueprints/technical.py

from flask import Blueprint, jsonify
import yfinance as yf
import pandas as pd
from ta.trend import ADXIndicator  # needs: pip install ta
from utils.market_sentiment import (
    get_sector_etf,
    scrape_put_call_ratio,
    scrape_short_float
)



tech_bp = Blueprint('technical', __name__, url_prefix='/technical')

def calculate_rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = -delta.clip(upper=0).rolling(period).mean()
    rs    = gain / loss
    return round(100 - (100 / (1 + rs)).iloc[-1], 2)

def calculate_adx(df):
    adx = ADXIndicator(df['High'], df['Low'], df['Close'], window=14)
    return round(adx.adx().iloc[-1], 2)


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

def ema_crossovers(close: pd.Series):
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    signal = "Bullish Crossover" if ema12.iloc[-1] > ema26.iloc[-1] else "Bearish Crossover"
    return signal


def stochastic_rsi(series: pd.Series, period: int = 14):
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    stoch_rsi = (rsi - rsi.rolling(period).min()) / (rsi.rolling(period).max() - rsi.rolling(period).min())
    return round(stoch_rsi.iloc[-1] * 100, 2)


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

def calculate_volatility_index(close: pd.Series, window: int = 20, long_window: int = 100):
    sma = close.rolling(window).mean()
    std = close.rolling(window).std()

    bb_upper = sma + 2 * std
    bb_lower = sma - 2 * std
    bbw = (bb_upper - bb_lower) / sma

    vol_index = bbw.iloc[-1] / bbw.rolling(long_window).mean().iloc[-1]
    return round(vol_index, 3), vol_index < 0.75  # second value = is_squeeze


@tech_bp.route('/<ticker>')
def get_technical(ticker):
    # fetch 1y daily
    df = yf.Ticker(ticker).history(period='1y')
    if df.empty:
        return jsonify({"error": "No data"}), 400

    close = df['Close']
    vol   = df['Volume']

    # Bollinger Bands
    vol_index, is_squeeze = calculate_volatility_index(close)
    
    # Sector & ETF Market Sentiment
    info = yf.Ticker(ticker).info
    sector = info.get("sector")
    etf = get_sector_etf(sector)

    put_call = scrape_put_call_ratio(etf)
    short_float = scrape_short_float(ticker)

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
        "last_candle": str(candle),
        "volatility_index": vol_index,
        "squeeze_zone": "Compression" if is_squeeze else "Expansion",
        "ema_crossover": ema_crossovers(close),
        "stochastic_rsi": float(stochastic_rsi(close)),
        "adx": calculate_adx(df),
        "put_call_ratio": put_call,
        "short_float_percent": short_float,
    })

