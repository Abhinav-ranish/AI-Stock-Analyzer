import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import TradingViewWidget from "./TradingViewWidget";
import "./StockAnalyzer.css"; // Import the CSS file

export default function StockAnalyzer() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:5000/analyze?ticker=${ticker}`);
      if (!response.ok) {
        console.error("Error fetching stock data:", response.statusText);
        setLoading(false);
        return;
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatAnalysis = (text) => {
    if (!text) return "No analysis available";
    return text
      .replace(/\*\*(.*?)\*\*/g, "\n$1")
      .split("\n")
      .map((line, index) => (
        <p key={index} style={{ fontWeight: line.startsWith("**") ? "bold" : "normal" }}>
          {line}
        </p>
      ));
  };

  return (
    <div className="app-container">
      {/* Top Navigation / Links */}
      <div className="top-links">
        <div className="links-left">
          <a href={`https://finance.yahoo.com/quote/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            Yahoo Finance
          </a>
          <a href={`https://www.tradingview.com/chart/?symbol=${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            TradingView
          </a>
          <a href={`https://www.investopedia.com/markets/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            Investopedia
          </a>
          <a href={`https://robinhood.com/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            Robinhood
          </a>
        </div>
        <div className="links-right">
          <a href={`https://www.tipranks.com/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            TipRanks
          </a>
          <a href={`https://www.zacks.com/stock/quote/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            Zacks
          </a>
          <a href={`https://www.nasdaq.com/market-activity/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            Nasdaq
          </a>
          <a href={`http://openinsider.com/search?q=${ticker || ""}`} target="_blank" rel="noopener noreferrer">
            OpenInsider
          </a>
          {ticker && (
            <a href={`https://stockinvest.us/stock/${ticker}`} target="_blank" rel="noopener noreferrer">
              StockInvest
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main">
        <h1 className="title">Stock Analyzer</h1>

        <div className="search-bar">
          <input
            className="ticker-input"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter Stock Ticker"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchStockData(); // Call the function when Enter is pressed
              }
            }}
          />
          <button className="analyze-button" onClick={fetchStockData} disabled={loading}>
            {loading ? "Loading..." : "Analyze"}
          </button>
        </div>

        {/* Two-Column Layout */}
        <div className="row">
          {/* Left Column (Analysis) */}
          <div className="col-left">
            <div className="card">
              <h2>AI Analysis</h2>
              <div className="analysis-text">{data ? formatAnalysis(data.analysis) : "No analysis yet"}</div>
            </div>

            {data && (
              <div className="card">
                <h2>{data.ticker} Analysis</h2>
                <p>Price: {data.price?.toFixed(2)}</p>
                <p>RSI: {data.rsi?.toFixed(2)} | P/E Ratio: {data.pe_ratio?.toFixed(2)}</p>
                <p>MACD: {data.macd?.toFixed(2)} | Signal: {data.signal?.toFixed(2)}</p>
                <p>50-day SMA: {data.sma_50?.toFixed(2)} | 200-day SMA: {data.sma_200?.toFixed(2)}</p>

                {/* Optional Recharts Graph */}
                {data.history && data.history["1y"] && (
                  <LineChart width={300} height={200} data={data.history["1y"]}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="Close" stroke="#8884d8" />
                  </LineChart>
                )}
              </div>
            )}
          </div>

          {/* Right Column (TradingView Chart) */}
          <div className="col-right">
            <div className="card full-height">
              {ticker ? (
                <TradingViewWidget ticker={ticker} />
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>Enter a ticker to see the chart.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
