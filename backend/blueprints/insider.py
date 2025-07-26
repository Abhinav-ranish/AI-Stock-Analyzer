from flask import Blueprint, jsonify
import os
import requests

ins_bp = Blueprint('insider', __name__, url_prefix='/insider')

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

def fetch_finnhub_insider_data(ticker):
    base_url = "https://finnhub.io/api/v1"
    headers = {"X-Finnhub-Token": FINNHUB_API_KEY}

    tx_url = f"{base_url}/stock/insider-transactions?symbol={ticker}"
    try:
        tx_resp = requests.get(tx_url, headers=headers, timeout=10)
        tx_resp.raise_for_status()
        transactions = tx_resp.json().get("data", [])
    except Exception as e:
        print(f"[insider] Error fetching data: {e}")
        return {"error": "Failed to fetch data"}

    # Filtering
    MIN_SHARES = 100_000
    MIN_VALUE = 1_000_000
    filtered = []

    for t in transactions:
        try:
            shares = abs(t.get("change", 0))
            price = t.get("transactionPrice", 0)
            value = shares * price

            if shares >= MIN_SHARES or value >= MIN_VALUE:
                filtered.append({
                    "name": t.get("name"),
                    "shares_changed": shares,
                    "price": price,
                    "value": round(value, 2),
                    "date": t.get("transactionDate"),
                    "filing_date": t.get("filingDate"),
                    "code": t.get("transactionCode"),
                    "symbol": t.get("symbol")
                })
        except Exception:
            continue

    result_json = {"insider_transactions": filtered}

    # Optional: debug print with safe trimming
    preview = str(result_json)
    if len(preview) > 1000:
        print("[insider preview]", preview[:1000] + "...")
    else:
        print("[insider preview]", preview)

    return result_json

@ins_bp.route('/<ticker>')
def get_insider_info(ticker):
    data = fetch_finnhub_insider_data(ticker.upper())
    return jsonify(data)
