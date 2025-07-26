import json, time
from blueprints.ai_summary import get_groq_analysis

peer_cache = {}
PEER_CACHE_TTL = 3600

def get_cached_peers(ticker):
    now = time.time()
    if ticker in peer_cache:
        ts, peers = peer_cache[ticker]
        if now - ts < PEER_CACHE_TTL:
            return peers
    try:
        prompt = f"Give me 5 stocks similar to {ticker} as a JSON array of short ticker names."
        peers = json.loads(get_groq_analysis(prompt))
        peer_cache[ticker] = (now, peers)
        return peers
    except Exception:
        return []
