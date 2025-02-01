import requests
import yfinance as yf
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
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

app = Flask(__name__)
CORS(app)

def get_stock_data(ticker):
    stock = yf.Ticker(ticker)
    data_dict = {}

    for timeframe in ['7d', '1mo', '3mo','6mo', '1y', '5y']:
        data = stock.history(period=timeframe)
        if data.empty:
            print(f"Warning: No data found for {ticker} in {timeframe} timeframe.")
            continue

        data_dict[timeframe] = data  

    if '1y' in data_dict and not data_dict['1y'].empty:
        data_1y = data_dict['1y']
        data_1y['SMA_50'] = data_1y['Close'].rolling(window=50).mean()
        data_1y['SMA_200'] = data_1y['Close'].rolling(window=200).mean()
        
        return {
            'history': data_dict,
            'SMA_50': data_1y['SMA_50'].iloc[-1] if len(data_1y) >= 50 else None,
            'SMA_200': data_1y['SMA_200'].iloc[-1] if len(data_1y) >= 200 else None
        }
    
    return {'history': data_dict, 'SMA_50': None, 'SMA_200': None}


def calculate_rsi(data, period=14):
    """Calculate Relative Strength Index (RSI)."""
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_fundamental_data(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info
    
    return {
        'pe_ratio': info.get('trailingPE'),
        'ps_ratio': info.get('priceToSalesTrailing12Months'),
        'earnings_growth': info.get('earningsGrowth'),
        'revenue_growth': info.get('revenueGrowth')
    }

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

def analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age, fund_data, sma_50, sma_200):
    """Use Ollama AI to analyze stock data and provide insights based on selected checkboxes."""
    last_rsi = rsi.iloc[-1] if not rsi.empty else "N/A"
    last_macd = macd.iloc[-1] if not macd.empty else "N/A"
    last_signal = signal.iloc[-1] if not signal.empty else "N/A"
    
    prompt = f"""
    Analyze the following stock data for {ticker}:
    RSI: {last_rsi}
    50-day SMA: {sma_50}
    200-day SMA: {sma_200}
    MACD: {last_macd}, Signal: {last_signal}
    Fundatmental Data: {fund_data}
    Insider Trades: {insider_trades[:500]}... (truncated)
    News Sentiment: {news_sentiment}
    Investing Amount: 100$

    Consider the following investor preferences:
    Risk Level: {risk_level}
    Age: {age} years. Lower the age increase the risk tolerance because more time to recover.
    Investment Duration: {investment_duration}
    
    Based on this information, predict the stock's short-term trend.
    Print out the PE ratio then a Confidence percentage of the prediction. 
    Base your reasoning by past performance insider trading and news sentiments. Strongly consider insider trading if there is a Purchase of over 150k$. If there is too many sales then it is a red flag.

    Example Output Format:
    PE Ratio: 20
    Confidence: 80%
    Reasoning: The stock has a low PE ratio and strong insider buying, indicating a potential uptrend.
    News sentiment is positive, and the MACD is crossing above the signal line.
    Amount of investment: 100$
    """
    response = ollama.chat(model='llama3.2:latest', messages=[{"role": "user", "content": prompt}])
    return response["message"]["content"]


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['GET', 'POST'])
def analyze():
    """Handle stock analysis request."""
    ticker = request.args.get("ticker")  # Get ticker from URL parameters
    risk_level = "Medium Risk - 60% safe investments, 40% risky investments with moderate returns"
    investment_duration = "Medium-term - 6 months to 1 year"
    age = "19"

    if not ticker:
        return jsonify({"error": "No ticker symbol provided."}), 400
    
    fund_data = get_fundamental_data(ticker)
    insider_trades = get_insider_trading(ticker)
           
   # ✅ Fetch stock data
    stock_data = get_stock_data(ticker)
    if not stock_data or not stock_data['history']:
        return jsonify({"error": "No stock data available."}), 400

    # ✅ Extract relevant stock indicators
    one_year_data = stock_data['history'].get('1y', pd.DataFrame())
    if one_year_data.empty:
        return jsonify({"error": "No 1-year stock data available."}), 400

    rsi = calculate_rsi(one_year_data)
    macd, signal = calculate_macd(one_year_data)

    news_sentiment = get_news_sentiment(ticker)
    analysis = analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age, fund_data, stock_data['SMA_50'], stock_data['SMA_200'])

    return jsonify({
        "ticker": ticker,
        "rsi": rsi.iloc[-1] if not rsi.empty else None,
        "macd": macd.iloc[-1] if not macd.empty else None,
        "signal": signal.iloc[-1] if not signal.empty else None,
        "insider_trades": insider_trades,
        "fund_data": fund_data,
        "sma_50": stock_data['SMA_50'],
        "sma_200": stock_data['SMA_200'],
        "news_sentiment": news_sentiment,
        "analysis": analysis
    })

if __name__ == '__main__':
    app.run(debug=True)



# def scan_stocks():
#     """Continuously scan the stock market and identify investment opportunities."""
#     tickers = ["AAPL", "TSLA", "NVDA", "AMZN", "GOOGL"]  # Expand with more tickers
#     medium = "Medium Risk - 60% safe investments, 40% risky investments with moderate returns"
#     lowrisk = "Low Risk - 80% safe investments, 20% risky investments with potential returns"
#     highrisk = "High Risk  - 40% safe investments, 60% risky investments with big potential returns"
#     shortterm = "Short-term - 1 month or less"
#     mediumterm = "Medium-term - 6 months to 1 year"
#     longterm = "Long-term - 1 to 3 years"
#     age = "19"
    
    
#     while True:
#         for ticker in tickers:
#             print(f"Scanning {ticker}...")
#             data = get_stock_data(ticker)  # Now returns a dictionary
            
#             if '1mo' not in data or data['1mo'].empty:
#                 print(f"Warning: No data found for {ticker} in 1mo timeframe.")
#                 continue  # Skip this ticker
            
#             # Now safely access '1mo' data
#             rsi = calculate_rsi(data['1mo'])
#             macd, signal = calculate_macd(data['1mo'])

#             insider_trades = get_insider_trading(ticker)
#             news_sentiment = get_news_sentiment(ticker)
#             fund_data = get_fundamental_data(ticker)
            
#             # Set default risk level and investment duration (change as needed)
#             risk_level = medium # Default to medium risk
#             investment_duration = mediumterm # Default to short-term

#             ai_analysis = analyze_with_ollama(
#                 ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age, fund_data
#             )
            
#             print(f"AI Analysis for {ticker}: {ai_analysis}")
            
#             # Show dashboard for the first scanned stock (optional)
#             show_dashboard(ticker, rsi, macd, signal, insider_trades, news_sentiment, ai_analysis)

#         print("Sleeping for 1 hour before next scan...")
#         time.sleep(3600)  # Scan every hour


# if __name__ == "__main__":
#     scan_stocks()
