# blueprints/news.py

from flask import Blueprint, request, jsonify
import os
import requests
from textblob import TextBlob
from datetime import datetime, timedelta
from urllib.parse import urlparse

news_bp = Blueprint('news', __name__, url_prefix='/news')

# define your trusted sources
REPUTABLE_SOURCES = {
    "Reuters", "Bloomberg", "Financial Times", "BBC News", "The Wall Street Journal",
    "MarketWatch", "Barron's", "CNBC", "Seeking Alpha", "Yahoo Finance"
}

TRUSTED_DOMAINS = {
    "reuters.com", "bloomberg.com", "ft.com", "bbc.com", "wsj.com",
    "marketwatch.com", "barrons.com", "cnbc.com", "seekingalpha.com", "finance.yahoo.com"
}

NEWS_API_KEY = os.getenv("NEWSAPI_KEY")
NEWS_API_URL = "https://newsapi.org/v2/everything"

def is_reputable_article(source: str, url: str) -> bool:
    domain = urlparse(url).netloc.replace("www.", "")
    return source in REPUTABLE_SOURCES or domain in TRUSTED_DOMAINS

def fetch_and_analyze_news(ticker, days_back=7):
    print(f"[NEWS] Fetching news for {ticker}")
    params = {
        "q": f'{ticker} stock',
        "apiKey": NEWS_API_KEY,
        "language": "en",
        "from": (datetime.utcnow() - timedelta(days=days_back)).isoformat(),
        "sortBy": "publishedAt",
        "pageSize": 50
    }

    try:
        resp = requests.get(NEWS_API_URL, params=params, timeout=10)
        print("[NEWS] Status code:", resp.status_code)
        resp.raise_for_status()
        data = resp.json()
        print("[NEWS] Raw JSON keys:", list(data.keys()))
    except Exception as e:
        print(f"[NEWS] Fetch error: {e}")
        return {"positive": 0, "negative": 0, "neutral": 0}, []

    articles = data.get('articles', [])
    sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
    trusted_articles = []
    fallback_articles = []
    seen_titles = set()

    for article in articles:
        source = article.get("source", {}).get("name", "")
        url    = article.get("url", "")
        title  = article.get("title", "") or ""

        if not title or title in seen_titles:
            continue
        seen_titles.add(title)

        polarity = TextBlob(title).sentiment.polarity
        sentiment = (
            "positive" if polarity > 0.1 else
            "negative" if polarity < -0.1 else
            "neutral"
        )

        article_obj = {
            "title": title,
            "url": url,
            "source": source,
            "publishedAt": article.get("publishedAt"),
            "sentiment": sentiment,
            "polarity": round(polarity, 3)
        }

        if is_reputable_article(source, url):
            trusted_articles.append(article_obj)
            sentiment_counts[sentiment] += 1
        else:
            fallback_articles.append(article_obj)

    final_articles = trusted_articles if trusted_articles else fallback_articles
    final_articles.sort(key=lambda x: x["publishedAt"], reverse=True)

    return sentiment_counts, final_articles[:5]

@news_bp.route('/<ticker>')
def get_filtered_news(ticker):
    try:
        counts, stories = fetch_and_analyze_news(ticker)
    except requests.RequestException as e:
        return jsonify({"error": f"News fetch failed: {e}"}), 502

    print("NEWS_API_KEY loaded:", NEWS_API_KEY[:5] + "..." if NEWS_API_KEY else "MISSING")

    return jsonify({
        "sentiment_counts": counts,
        "top_stories": stories
    })
