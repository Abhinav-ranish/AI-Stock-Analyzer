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

def analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age):
    """Use Ollama AI to analyze stock data and provide insights based on selected checkboxes."""
    last_rsi = rsi.iloc[-1] if not rsi.empty else "N/A"
    last_macd = macd.iloc[-1] if not macd.empty else "N/A"
    last_signal = signal.iloc[-1] if not signal.empty else "N/A"
    
    prompt = f"""
    Analyze the following stock data for {ticker}:
    RSI: {last_rsi}
    MACD: {last_macd}, Signal: {last_signal}
    Insider Trades: {insider_trades[:500]}... (truncated)
    News Sentiment: {news_sentiment}
    
    Consider the following investor preferences:
    Risk Level: {risk_level}
    Age: {age} years. Lower the age increase the risk tolerance because more time to recover.
    Investment Duration: {investment_duration}
    
    Based on this information, predict the stock's short-term trend and justify your reasoning.
    """
    response = ollama.chat(model='llama3.2:latest', messages=[{"role": "user", "content": prompt}])
    return response["message"]["content"]


def show_dashboard(ticker, rsi, macd, signal, insider_trades, news_sentiment, ai_analysis):
    """Display a GUI dashboard with stock analysis results and user options."""
    root = tk.Tk()
    root.title(f"Stock Analysis Dashboard - {ticker}")
    
    frame = ttk.Frame(root, padding=10)
    frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
    
    ttk.Label(frame, text=f"Ticker: {ticker}", font=("Arial", 14, "bold")).grid(row=0, column=0, columnspan=2, pady=5)
    ttk.Label(frame, text=f"RSI: {rsi.iloc[-1]:.2f}").grid(row=1, column=0, sticky=tk.W)
    ttk.Label(frame, text=f"MACD: {macd.iloc[-1]:.2f}").grid(row=2, column=0, sticky=tk.W)
    ttk.Label(frame, text=f"Signal: {signal.iloc[-1]:.2f}").grid(row=3, column=0, sticky=tk.W)
    ttk.Label(frame, text=f"News Sentiment: {news_sentiment:.2f}").grid(row=4, column=0, sticky=tk.W)
    
    # Checkboxes for Risk Level
    risk_label = ttk.Label(frame, text="Select Risk Level:")
    risk_label.grid(row=5, column=0, sticky=tk.W)
    risk_var = tk.StringVar(value="Medium")
    low_risk = ttk.Radiobutton(frame, text="Low", variable=risk_var, value="Low")
    med_risk = ttk.Radiobutton(frame, text="Medium", variable=risk_var, value="Medium")
    high_risk = ttk.Radiobutton(frame, text="High", variable=risk_var, value="High")
    low_risk.grid(row=6, column=0, sticky=tk.W)
    med_risk.grid(row=6, column=1, sticky=tk.W)
    high_risk.grid(row=6, column=2, sticky=tk.W)
    
    # Checkboxes for Investment Duration
    duration_label = ttk.Label(frame, text="Select Investment Duration:")
    duration_label.grid(row=7, column=0, sticky=tk.W)
    duration_var = tk.StringVar(value="Medium-term")
    short_term = ttk.Radiobutton(frame, text="Short-term (<1 month)", variable=duration_var, value="Short-term")
    medium_term = ttk.Radiobutton(frame, text="Medium-term (6 months - 1 year)", variable=duration_var, value="Medium-term")
    long_term = ttk.Radiobutton(frame, text="Long-term (1-3 years)", variable=duration_var, value="Long-term")
    short_term.grid(row=8, column=0, sticky=tk.W)
    medium_term.grid(row=8, column=1, sticky=tk.W)
    long_term.grid(row=8, column=2, sticky=tk.W)
    
    insider_text = tk.Text(frame, height=5, width=60)
    insider_text.insert(tk.END, f"Insider Trades: {insider_trades[:500]}... (truncated)")
    insider_text.grid(row=9, column=0, columnspan=2, pady=5)
    
    ai_text = tk.Text(frame, height=10, width=60)
    ai_text.insert(tk.END, f"AI Analysis: {ai_analysis}")
    ai_text.grid(row=10, column=0, columnspan=2, pady=5)
    
    ttk.Button(frame, text="Close", command=root.destroy).grid(row=11, column=0, columnspan=2, pady=10)
    
    root.mainloop()



def scan_stocks():
    """Continuously scan the stock market and identify investment opportunities."""
    tickers = ["AAPL", "TSLA", "NVDA", "AMZN", "GOOGL"]  # Expand with more tickers
    medium = "Medium Risk - 60% safe investments, 40% risky investments with moderate returns"
    lowrisk = "Low Risk - 80% safe investments, 20% risky investments with potential returns"
    highrisk = "High Risk  - 40% safe investments, 60% risky investments with big potential returns"
    shortterm = "Short-term - 1 month or less"
    mediumterm = "Medium-term - 6 months to 1 year"
    longterm = "Long-term - 1 to 3 years"
    age = "19"
    
    
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
            
            # Set default risk level and investment duration (change as needed)
            risk_level = medium # Default to medium risk
            investment_duration = mediumterm # Default to short-term

            ai_analysis = analyze_with_ollama(
                ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age
            )
            
            print(f"AI Analysis for {ticker}: {ai_analysis}")
            
            # Show dashboard for the first scanned stock (optional)
            show_dashboard(ticker, rsi, macd, signal, insider_trades, news_sentiment, ai_analysis)

        print("Sleeping for 1 hour before next scan...")
        time.sleep(3600)  # Scan every hour


if __name__ == "__main__":
    scan_stocks()
