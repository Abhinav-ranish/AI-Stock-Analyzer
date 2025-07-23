# blueprints/insider.py

from flask import Blueprint, request, jsonify
import requests
import yfinance as yf
from bs4 import BeautifulSoup

ins_bp = Blueprint('insider', __name__, url_prefix='/insider')

def get_insider_trading(ticker):
    """Fetch and parse insider trading data from OpenInsider."""
    url = f"http://openinsider.com/screener?s={ticker}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        table = soup.find("table", class_="tinytable")
        if not table:
            return []

        rows = table.find_all("tr")[1:]  # skip header
        trades = []
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 11:
                continue

            trades.append({
                "filing_date": cols[1].get_text(strip=True),
                "trade_date":   cols[2].get_text(strip=True),
                "insider":      cols[4].get_text(strip=True),
                "trade_type":   cols[6].get_text(strip=True),
                "price":        cols[7].get_text(strip=True),
                "quantity":     cols[8].get_text(strip=True).replace(',', ''),
                "value":        cols[10].get_text(strip=True).replace(',', ''),
            })
        return trades

    except requests.RequestException as e:
        # Log or handle error as you prefer
        print(f"[insider] error fetching {ticker}: {e}")
        return []

@ins_bp.route('/<ticker>')
def get_filtered_insider(ticker):
    # 1) scrape all insider trades
    trades = get_insider_trading(ticker)

    # 2) pull float shares from yfinance
    info = yf.Ticker(ticker).info
    float_shares = info.get('floatShares')

    big_trades = []
    if float_shares:
        for t in trades:
            try:
                qty = int(t['quantity'])
                if qty / float_shares >= 0.01:
                    big_trades.append(t)
            except ValueError:
                continue

    # if we couldn’t get float_shares, just return everything
    return jsonify(big_trades if float_shares else trades)
