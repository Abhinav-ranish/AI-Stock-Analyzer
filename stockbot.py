import requests
import yfinance as yf
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from collections import defaultdict
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

# Store stock metadata
# Initialize your vector store with the appropriate dimension

class VectorStore:
    def __init__(self, dimension):
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.metadata = []  # List to store metadata (e.g., ticker, description)

    def add_vector(self, vector, meta):
        # vector: np.array of shape (dimension,)
        # meta: a dictionary containing metadata
        self.index.add(np.array([vector]))
        self.metadata.append(meta)

    def search(self, query_vector, k=3):
        distances, indices = self.index.search(np.array([query_vector]), k)
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                results.append(self.metadata[idx])
        return results

vector_store = VectorStore(dimension=384)


load_dotenv()  # Load environment variables from .env file
NEWS_API_KEY = os.getenv("NEWSAPI_KEY")

app = Flask(__name__)
CORS(app)

# Simple in-memory rate limiter
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 5
_request_log = defaultdict(list)

def is_rate_limited(ip: str) -> bool:
    now = time.time()
    timestamps = _request_log[ip]
    # Remove timestamps outside of window
    _request_log[ip] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(_request_log[ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    _request_log[ip].append(now)
    return False


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
        'price': info.get('previousClose'),
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

def get_news_analysis(ticker):
    """Fetch recent news articles for the given ticker, count sentiment polarity, and return top stories."""
    # Define a list of reputable sources (update this list as needed)
    reputable_sources = {"Reuters", "Bloomberg", "BBC News", "The New York Times", "Financial Times"}

    news_api_url = f"https://newsapi.org/v2/everything?q={ticker}&apiKey={NEWS_API_KEY}&language=en"
    response = requests.get(news_api_url)
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    top_stories = []

    if response.status_code == 200:
        articles = response.json().get('articles', [])
        analyzed_articles = []

        for article in articles:
            title = article.get('title', '')
            # Use TextBlob to analyze the title sentiment
            polarity = TextBlob(title).sentiment.polarity

            # Set thresholds; you can tweak these as needed
            if polarity > 0.1:
                sentiment_counts["positive"] += 1
                sentiment = "positive"
            elif polarity < -0.1:
                sentiment_counts["negative"] += 1
                sentiment = "negative"
            else:
                sentiment_counts["neutral"] += 1
                sentiment = "neutral"

            # Add article info for further processing
            analyzed_articles.append({
                "title": title,
                "url": article.get("url"),
                "source": article.get("source", {}).get("name", "Unknown"),
                "description": article.get("description", ""),
                "publishedAt": article.get("publishedAt", ""),
                "sentiment": sentiment,
                "polarity": polarity
            })

        # Filter for top stories from reputable sources if available
        reputable_articles = [a for a in analyzed_articles if a["source"] in reputable_sources]
        # Fallback: if none from reputable sources, use all articles
        articles_to_consider = reputable_articles if reputable_articles else analyzed_articles
        # Sort by published date (descending) and pick top 5
        articles_to_consider.sort(key=lambda x: x["publishedAt"], reverse=True)
        top_stories = articles_to_consider[:5]

    return {
        "sentiment_counts": sentiment_counts,
        "top_stories": top_stories
    }

def analyze_with_ollama(price, ticker, rsi, macd, signal, insider_trades, news_analysis, risk_level, investment_duration, age, peratio, psratio, earnings_growth, revenue_growth, sma_50, sma_200):
    """Use RAG-enhanced stock data before sending it to Ollama AI."""
    similar_stocks = retrieve_similar_stocks(ticker)
    last_rsi = rsi.iloc[-1] if not rsi.empty else "N/A"
    last_macd = macd.iloc[-1] if not macd.empty else "N/A"
    last_signal = signal.iloc[-1] if not signal.empty else "N/A"
    
    # Prepare news sentiment information from the news_analysis dict
    sentiment_counts = news_analysis.get("sentiment_counts", {"positive": 0, "negative": 0, "neutral": 0})
    top_stories = news_analysis.get("top_stories", [])
    
    # Format the top stories for the prompt
    top_stories_formatted = "\n".join(
        [f"{i+1}. {story['title']} ({story['source']}) - {story['url']}" for i, story in enumerate(top_stories)]
    )
    
    prompt = f"""
    Analyze the stock {ticker} with the following data:
    
    Stock Data:
    - Price: {price}
    - RSI: {round(last_rsi, 2)}
    - PE Ratio: {peratio}  (Important: High values may indicate overvaluation while low values may indicate undervaluation.)
    - PS Ratio: {psratio}
    - Earnings Growth: {earnings_growth}
    - Revenue Growth: {revenue_growth}
    - 50-day SMA: {round(sma_50, 2) if sma_50 else 'N/A'}, 200-day SMA: {round(sma_200, 2) if sma_200 else 'N/A'}
    - MACD: {round(last_macd, 2)}, Signal: {round(last_signal, 2)}
    - Insider Trades: {insider_trades} (Large sell-offs are bearish; large buys are bullish.)
    
    News Analysis:
    - Sentiment Counts: Positive: {sentiment_counts.get('positive', 0)}, Negative: {sentiment_counts.get('negative', 0)}, Neutral: {sentiment_counts.get('neutral', 0)}
    - Top Stories:
    {top_stories_formatted if top_stories_formatted else 'N/A'}
    
    My Investor Profile:
    - Risk Level: {risk_level}
    - Age: {age} years
    - Investment Duration: {investment_duration}
    
    Similar Stocks for reference: {', '.join(similar_stocks) if similar_stocks else 'N/A'}
    
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
    """Store stock data embeddings in the vector store for similarity-based retrieval."""
    if not stock_data:
        return
    
    description = f"Ticker: {ticker}, RSI: {stock_data['RSI']}, MACD: {stock_data['MACD']}, SMA-200: {stock_data['SMA_200']}, PE Ratio: {stock_data.get('pe_ratio', 'N/A')}"
    
    # Generate embedding using the SentenceTransformer model
    vector = model.encode([description])[0]
    
    # Store the vector and its associated metadata in the vector store
    meta = {
        "last_price": stock_data['last_price'],
        "ticker": ticker,
        "description": description,
        "RSI": stock_data['RSI'],
        "MACD": stock_data['MACD'],
        "SMA_200": stock_data['SMA_200'],
        "pe_ratio": stock_data.get('pe_ratio', None)
    }
    vector_store.add_vector(vector, meta)



def retrieve_similar_stocks(ticker):
    """Retrieve similar stocks based on stored vector embeddings."""
    # First, retrieve the metadata for the given ticker to form the query
    meta = next((m for m in vector_store.metadata if m["ticker"] == ticker), None)
    if not meta:
        return None

    query_vector = model.encode([meta["description"]])[0]
    results = vector_store.search(query_vector, k=3)
    
    # Exclude the queried ticker from the results if necessary
    similar_tickers = [res["ticker"] for res in results if res["ticker"] != ticker]
    return similar_tickers


@app.route('/groq', methods=['POST'])
def call_groq():
    """Proxy question/answer requests to the Groq API."""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown')
    if is_rate_limited(ip):
        return jsonify({'error': 'Too many requests. Slow down.'}), 429

    data = request.get_json() or {}
    question = data.get('question')
    context = data.get('context')

    if not question or not isinstance(question, str):
        return jsonify({'error': 'Invalid question'}), 400

    base_context = """""".strip()
    merged_context = (
        f"{base_context}\n\nExtra details:\n{context}"
        if context and isinstance(context, str)
        else base_context
    )

    messages = [
        {"role": "system", "content": "B"},
        {"role": "system", "content": merged_context},
        {"role": "user", "content": question},
    ]

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=messages,
        )
        answer = (
            completion.choices[0].message.content
            if completion.choices else ""
        )
        return jsonify({"answer": answer})
    except Exception as err:
        print('Groq error:', err)
        return jsonify({'error': str(err)}), 500


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
    price = fund_data['price']
    print(ticker + " " + str(fund_data))
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

    news_data = get_news_analysis(ticker)
    news_sentiment_counts = news_data["sentiment_counts"]
    top_stories = news_data["top_stories"]
    # ✅ Store stock data in FAISS for retrieval
    store_stock_data(ticker, {
        "RSI": rsi.iloc[-1] if not rsi.empty else None,
        "MACD": macd.iloc[-1] if not macd.empty else None,
        "SMA_200": stock_data['SMA_200'],
        "pe_ratio": fund_data['pe_ratio'],
        "last_price": price
    })
    print("News Data: ", news_data)
    analysis = analyze_with_ollama(price, ticker, rsi, macd, signal, insider_trades, news_data, risk_level, investment_duration, age, peratio, psratio, earnings_growth, revenue_growth, stock_data['SMA_50'], stock_data['SMA_200'])

    return jsonify({
        "ticker": ticker,
        "rsi": rsi.iloc[-1] if not rsi.empty else None,
        "price": price,
        "macd": macd.iloc[-1] if not macd.empty else None,
        "signal": signal.iloc[-1] if not signal.empty else None,
        "insider_trades": insider_trades,
        "pe_ratio": peratio,
        "ps_ratio": psratio,
        "earnings_growth": earnings_growth,
        "revenue_growth": revenue_growth,
        "sma_50": stock_data['SMA_50'],
        "sma_200": stock_data['SMA_200'],
        "news_sentiment": news_sentiment_counts,
        "top_stories": top_stories,
        "analysis": analysis,
        "similar_stocks": retrieve_similar_stocks(ticker)
    })

if __name__ == '__main__':
    app.run(debug=True)

