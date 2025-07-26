from flask import Blueprint, request, jsonify
import os
import requests
from textblob import TextBlob
from datetime import datetime, timedelta
from urllib.parse import urlparse
from pytrends.request import TrendReq

pytrends = TrendReq(hl='en-US', tz=360)
news_bp = Blueprint('news', __name__, url_prefix='/news')

# Trusted sources and domains
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

# Google Trends score for keyword
def get_google_trend_score(ticker: str) -> float:
    try:
        kw_list = [f"{ticker} stock"]
        pytrends.build_payload(kw_list, timeframe='now 7-d', geo='US')
        interest = pytrends.interest_over_time()
        if interest.empty:
            return 0.5
        trend_series = interest[kw_list[0]]
        score = trend_series[-3:].mean() / 100
        return round(min(max(score, 0), 1), 3)
    except Exception as e:
        print(f"[TRENDS] Failed to fetch trend for {ticker}: {e}")
        return 0.5

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
    except Exception as e:
        print(f"[NEWS] Fetch error: {e}")
        return {
            "positive": 0,
            "negative": 0,
            "neutral": 0,
            "trend_score": 0.5,
            "news_score": 0.5,
            "combined_score": 0.5
        }, []

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

    # Trend score from Google Trends
    trend_score = get_google_trend_score(ticker)

    # News score from sentiment
    total = sum(sentiment_counts.values()) or 1
    news_score = (
        (sentiment_counts["positive"] - sentiment_counts["negative"]) / total
    )
    news_score = (news_score + 1) / 2  # normalize to [0, 1]

    # Weighted blend: 80% trend, 20% news
    combined_score = 0.8 * trend_score + 0.2 * news_score

    # Apply negative news penalty
    if sentiment_counts["negative"] > sentiment_counts["positive"] * 1.5:
        combined_score *= 0.85

    return {
        "positive": sentiment_counts["positive"],
        "negative": sentiment_counts["negative"],
        "neutral": sentiment_counts["neutral"],
        "trend_score": round(trend_score, 3),
        "news_score": round(news_score, 3),
        "combined_score": round(combined_score, 3)
    }, final_articles[:5]

@news_bp.route('/<ticker>')
def get_filtered_news(ticker):
    try:
        counts, stories = fetch_and_analyze_news(ticker)
    except requests.RequestException as e:
        return jsonify({"error": f"News fetch failed: {e}"}), 502

    print("NEWS_API_KEY loaded:", NEWS_API_KEY[:5] + "..." if NEWS_API_KEY else "MISSING")

    return jsonify({
        "sentiment_counts": {
            "positive": counts["positive"],
            "negative": counts["negative"],
            "neutral": counts["neutral"]
        },
        "trend_score": counts["trend_score"],
        "news_score": counts["news_score"],
        "combined_score": counts["combined_score"],
        "top_stories": stories
    })
