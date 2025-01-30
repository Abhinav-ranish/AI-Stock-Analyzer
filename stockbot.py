import requests
import yfinance as yf
import pandas as pd
import numpy as np
import tkinter as tk
from tkinter import ttk
from textblob import TextBlob
from sklearn.linear_model import LinearRegression
import ollama
import time

def get_stock_data(ticker):
    """Fetch historical stock data for different timeframes."""
    stock = yf.Ticker(ticker)
    timeframes = {
        '1wk': stock.history(period='7d'),
        '1mo': stock.history(period='1mo'),
        '6mo': stock.history(period='6mo'),
        '1yr': stock.history(period='1y'),
        '5yr': stock.history(period='5y')
    }
    return timeframes

def calculate_rsi(data, period=14):
    """Calculate Relative Strength Index (RSI)."""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(data):
    """Calculate MACD and Signal Line."""
    short_ema = data['Close'].ewm(span=12, adjust=False).mean()
    long_ema = data['Close'].ewm(span=26, adjust=False).mean()
    macd = short_ema - long_ema
    signal = macd.ewm(span=9, adjust=False).mean()
    return macd, signal

def get_insider_trading(ticker):
    """Fetch insider trading data from OpenInsider."""
    url = f"http://openinsider.com/screener?s={ticker}"  # Placeholder
    response = requests.get(url)
    if response.status_code == 200:
        return response.text  # Need to parse HTML data
    return None

def get_news_sentiment(ticker):
    """Fetch recent news and analyze sentiment."""
    news_api_url = f"https://newsapi.org/v2/everything?q={ticker}&apiKey=YOUR_NEWSAPI_KEY"
    response = requests.get(news_api_url)
    if response.status_code == 200:
        articles = response.json().get('articles', [])
        sentiments = []
        for article in articles[:5]:  # Analyze the first 5 articles
            sentiment = TextBlob(article['title']).sentiment.polarity
            sentiments.append(sentiment)
        avg_sentiment = np.mean(sentiments) if sentiments else 0
        return avg_sentiment
    return None

def analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment):
    """Use Ollama AI to analyze stock data and provide insights."""
    prompt = f"""
    Analyze the following stock data for {ticker}:
    RSI: {rsi.iloc[-1]}
    MACD: {macd.iloc[-1]}, Signal: {signal.iloc[-1]}
    Insider Trades: {insider_trades[:500]}... (truncated)
    News Sentiment: {news_sentiment}
    
    Based on this information, predict the stock's short-term trend and justify your reasoning.
    """
    response = ollama.chat(model='mistral', messages=[{"role": "user", "content": prompt}])
    return response["message"]["content"]

def scan_stocks():
    """Continuously scan the stock market and identify investment opportunities."""
    tickers = ["AAPL", "TSLA", "NVDA", "AMZN", "GOOGL"]  # Expand with more tickers
    while True:
        for ticker in tickers:
            print(f"Scanning {ticker}...")
            data = get_stock_data(ticker)
            rsi = calculate_rsi(data['1mo'])
            macd, signal = calculate_macd(data['1mo'])
            insider_trades = get_insider_trading(ticker)
            news_sentiment = get_news_sentiment(ticker)
            ai_analysis = analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment)
            
            print(f"AI Analysis for {ticker}: {ai_analysis}")
        time.sleep(3600)  # Scan every hour

if __name__ == "__main__":
    scan_stocks()
