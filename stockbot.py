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
import faiss
from sentence_transformers import SentenceTransformer

# Load Sentence Transformer for embedding generation
model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize FAISS index
dimension = 384  # Must match SentenceTransformer output size
index = faiss.IndexFlatL2(dimension)

# Store stock metadata
stock_data_store = {}


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
    """Fetch and parse insider trading data from OpenInsider with correct formatting."""
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
            if len(cols) < 11:  # Ensure there are enough columns
                continue

            trade_info = {
                "Filing Date": cols[1].text.strip(),
                "Trade Date": cols[2].text.strip(),
                "Ticker": cols[3].text.strip(),
                "Insider Name": cols[4].text.strip(),
                "Title": cols[5].text.strip(),
                "Trade Type": cols[6].text.strip(),
                "Price": cols[7].text.strip(),
                "Quantity": cols[8].text.strip(),
                "Value": cols[10].text.strip(),
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

def analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age, peratio, psratio, earnings_growth, revenue_growth, sma_50, sma_200):
    """Use RAG-enhanced stock data before sending it to Ollama AI."""
    similar_stocks = retrieve_similar_stocks(ticker)
    last_rsi = rsi.iloc[-1] if not rsi.empty else "N/A"
    last_macd = macd.iloc[-1] if not macd.empty else "N/A"
    last_signal = signal.iloc[-1] if not signal.empty else "N/A"
# - Similar Stocks (for reference): {', '.join(similar_stocks) if similar_stocks else 'N/A'}
    prompt = f"""
    Analyze the stock {ticker} with the following data:

    - RSI: {round(last_rsi, 2)}
    - PE Ratio: {peratio} Very Important. If high, stock is overvalued. If low, stock is undervalued.
    - PS Ratio: {psratio}
    - Earnings Growth: {earnings_growth}
    - Revenue Growth: {revenue_growth}
    - 50-day SMA: {round(sma_50, 2) if sma_50 else 'N/A'}, 200-day SMA: {round(sma_200, 2) if sma_200 else 'N/A'}
    - MACD: {round(last_macd, 2)}, Signal: {round(last_signal, 2)}
    - Insider Trades: {insider_trades} IF huge sell off, it is a bearish signal. Dont Recommend buying. If huge buy, it is a bullish signal. Recommend buying.
    - News Sentiment: {news_sentiment} IF positive, it is a bullish signal. Recommend buying. If negative, it is a bearish signal. Dont Recommend buying.
    
    Investor Profile:
    - Risk Level: {risk_level}
    - Age: {age} years
    - Investment Duration: {investment_duration}

    **Provide a short, structured response with the following format:**
    
    **PE Ratio:** {peratio}
    **Confidence:** <value>%  
    **Prediction:** (Uptrend/Downtrend/Neutral)  
    **Reasoning:** <Brief explanation in 2-3 sentences>  
    **Investment:** <Buy/Sell/Hold>
    """
    
    response = ollama.chat(model='llama3.2:latest', messages=[{"role": "user", "content": prompt}], options={"num_gpu_layers": 10})
    return response["message"]["content"]

def store_stock_data(ticker, stock_data):
    """Store stock data embeddings in FAISS for similarity-based retrieval."""
    if not stock_data:
        return
    
    # Create a description for embedding
    description = f"""
    Stock {ticker} RSI {stock_data['RSI']}, MACD {stock_data['MACD']}, 
    SMA-200 {stock_data['SMA_200']},PE Ratio {stock_data.get('pe_ratio', 'N/A')}
    """
    
    # Generate embedding
    vector = model.encode([description])[0]
    
    # Ensure FAISS index is properly initialized
    global index  
    if not isinstance(index, faiss.IndexFlatL2):  # ✅ Check FAISS instance type
        print("⚠️ FAISS Index is not initialized properly! Re-initializing...")
        index = faiss.IndexFlatL2(384)  # Re-initialize
    
    # Store embedding in FAISS
    index.add(np.array([vector]))  # ✅ Now index.add() should work correctly
    
    # Store ticker metadata
    stock_data_store[ticker] = description


def retrieve_similar_stocks(ticker):
    """Retrieve most similar stocks based on stored FAISS embeddings."""
    if ticker not in stock_data_store:
        return None
    
    # Generate query vector
    query_vector = model.encode([stock_data_store[ticker]])[0]
    
    # Search in FAISS for most similar stocks
    distances, indices = index.search(np.array([query_vector]), k=3)  # Retrieve top 3 matches
    
    similar_tickers = [
        list(stock_data_store.keys())[i]
        for i in indices[0] if i < len(stock_data_store)
    ]
    
    return similar_tickers

@app.route('/')

@app.route('/analyze', methods=['GET', 'POST'])
def analyze():
    """Handle stock analysis request."""
    ticker = request.args.get("ticker")  # Get ticker from URL parameters
    risk_level = "Low Risk - 80% safe investments, 20% risky investments"
    investment_duration = "Medium-term - 6 months to 1 year"
    age = "19"

    if not ticker:
        return jsonify({"error": "No ticker symbol provided."}), 400
    
    fund_data = get_fundamental_data(ticker)
    peratio = fund_data['pe_ratio']
    print(peratio)
    psratio = fund_data['ps_ratio']
    earnings_growth = fund_data['earnings_growth']
    revenue_growth = fund_data['revenue_growth']
    insider_trades = get_insider_trading(ticker)
    print(ticker + "" + fund_data)       
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
    # ✅ Store stock data in FAISS for retrieval
    store_stock_data(ticker, {
        "RSI": rsi.iloc[-1] if not rsi.empty else None,
        "MACD": macd.iloc[-1] if not macd.empty else None,
        "SMA_200": stock_data['SMA_200'],
        "pe_ratio": fund_data['pe_ratio']
    })

    analysis = analyze_with_ollama(ticker, rsi, macd, signal, insider_trades, news_sentiment, risk_level, investment_duration, age, peratio, psratio, earnings_growth, revenue_growth, stock_data['SMA_50'], stock_data['SMA_200'])

    return jsonify({
        "ticker": ticker,
        "rsi": rsi.iloc[-1] if not rsi.empty else None,
        "macd": macd.iloc[-1] if not macd.empty else None,
        "signal": signal.iloc[-1] if not signal.empty else None,
        "insider_trades": insider_trades,
        "pe_ratio": peratio,
        "ps_ratio": psratio,
        "earnings_growth": earnings_growth,
        "revenue_growth": revenue_growth,
        "sma_50": stock_data['SMA_50'],
        "sma_200": stock_data['SMA_200'],
        "news_sentiment": news_sentiment,
        "analysis": analysis,
        "similar_stocks": retrieve_similar_stocks(ticker)
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
