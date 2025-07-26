from typing import Optional
import requests
from bs4 import BeautifulSoup

# Mapping of common sectors to representative ETFs
SECTOR_TO_ETF = {
    "Technology": "XLK",
    "Healthcare": "XLV",
    "Financial Services": "XLF",
    "Consumer Defensive": "XLP",
    "Consumer Cyclical": "XLY",
    "Industrials": "XLI",
    "Energy": "XLE",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Materials": "XLB",
}

def get_sector_etf(sector: str) -> str:
    return SECTOR_TO_ETF.get(sector, "SPY")


def scrape_put_call_ratio(etf_symbol: str) -> Optional[float]:
    try:
        url = f"https://www.barchart.com/etfs-funds/quotes/{etf_symbol}/overview"
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        for row in soup.select("div.block-content div.row"):
            label = row.select_one("span.name")
            value = row.select_one("span.last")
            if label and "Put/Call Ratio" in label.text:
                return float(value.text.strip())
    except Exception as e:
        print(f"[SCRAPER] Put/Call fetch failed: {e}")
    return None


def scrape_short_float(ticker: str) -> Optional[float]:
    try:
        url = f"https://finviz.com/quote.ashx?t={ticker}"
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        for row in soup.select("table.snapshot-table2 tr"):
            for i in range(0, len(row.find_all("td")), 2):
                label = row.find_all("td")[i].text
                value = row.find_all("td")[i+1].text
                if "Short Float" in label:
                    return float(value.replace("%", ""))
    except Exception as e:
        print(f"[SCRAPER] Short Float fetch failed: {e}")
    return None
