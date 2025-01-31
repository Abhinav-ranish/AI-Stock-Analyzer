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
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
NEWS_API_KEY = os.getenv("NEWSAPI_KEY")

def get_stock_data(ticker):
    stock = yf.Ticker(ticker)
    data_dict = {}  # Dictionary to store different timeframes

    for timeframe in ['7d', '1mo', '6mo', '1y', '5y']:
        data = stock.history(period=timeframe)
        if data.empty:
            print(f"Warning: No data found for {ticker} in {timeframe} timeframe.")
        else:
            print(f"Data retrieved for {ticker} in {timeframe}:")
            print(data.head())  # Print first few rows to debug

        data_dict[timeframe] = data  # Store in dictionary

    return data_dict  # Return a dictionary of dataframes



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
    """Fetch and parse insider trading data from OpenInsider."""
    url = f"http://openinsider.com/screener?s={ticker}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an error for HTTP issues

        soup = BeautifulSoup(response.text, "html.parser")

        # Find the insider trading table
        table = soup.find("table", class_="tinytable")
        if not table:
            print(f"No insider trading data found for {ticker}.")
            return None
        
        # Extract table rows
        rows = table.find_all("tr")[1:]  # Skip header row
        
        trades = []
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 10:  # Ensure it has enough columns
                continue
            
            trade_info = {
                "Filing Date": cols[0].text.strip(),
                "Trade Date": cols[1].text.strip(),
                "Ticker": cols[2].text.strip(),
                "Insider Name": cols[3].text.strip(),
                "Title": cols[4].text.strip(),
                "Trade Type": cols[5].text.strip(),
                "Price": cols[6].text.strip(),
                "Quantity": cols[7].text.strip(),
                "Owned After": cols[8].text.strip(),
                "Value": cols[9].text.strip()
            }
            trades.append(trade_info)
        
        return trades

    except requests.exceptions.RequestException as e:
        print(f"Error fetching insider trading data: {e}")
        return None


def get_news_sentiment(ticker):
    """Fetch recent news and analyze sentiment."""
    # Use the News API to fetch news articles. Get your API from https://newsapi.org/
    news_api_url = f"https://newsapi.org/v2/everything?q={ticker}&apiKey={NEWS_API_KEY}"
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
    
    # Prevent IndexError
    last_rsi = rsi.iloc[-1] if not rsi.empty else "N/A"
    last_macd = macd.iloc[-1] if not macd.empty else "N/A"
    last_signal = signal.iloc[-1] if not signal.empty else "N/A"

    print(f"RSI Value: {rsi.iloc[-1] if not rsi.empty else 'N/A'}")
    print(f"MACD Value: {macd.iloc[-1] if not macd.empty else 'N/A'}")
    print(f"Signal Line Value: {signal.iloc[-1] if not signal.empty else 'N/A'}")
    print(f"News Sentiment: {news_sentiment}")
    print(f"Insider Trading Data: {insider_trades[:2]}")  # Print only first two entries for clarity

    prompt = f"""
    Analyze the following stock data for {ticker}:
    RSI: {last_rsi}
    MACD: {last_macd}, Signal: {last_signal}
    Insider Trades: {insider_trades[:500]}... (truncated)
    News Sentiment: {news_sentiment}
    
    Based on this information, predict the stock's short-term trend and justify your reasoning.
    """
    response = ollama.chat(model='llama3.2:latest', messages=[{"role": "user", "content": prompt}])
    return response["message"]["content"]


def scan_stocks():
    """Continuously scan the stock market and identify investment opportunities."""
    tickers = ["AAPL", "TSLA", "NVDA", "AMZN", "GOOGL"]  # Expand with more tickers
    
    while True:
        for ticker in tickers:
            print(f"Scanning {ticker}...")
            data = get_stock_data(ticker)  # Now returns a dictionary
            
            if '1mo' not in data or data['1mo'].empty:
                print(f"Warning: No data found for {ticker} in 1mo timeframe.")
                continue  # Skip this ticker
            
            # Now safely access '1mo' data
            rsi = calculate_rsi(data['1mo'])
            macd, signal = calculate_macd(data['1mo'])

            insider_trades = get_insider_trading(ticker)
            news_sentiment = get_news_sentiment(ticker)
            ai_analysis = analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment)
            
            print(f"AI Analysis for {ticker}: {ai_analysis}")

        time.sleep(3600)  # Scan every hour


if __name__ == "__main__":
    scan_stocks()
