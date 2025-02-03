import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import "./App.css";

// UI Components
const Input = ({ value, onChange, placeholder }) => (
  <input className="border p-2 rounded w-full" value={value} onChange={onChange} placeholder={placeholder} />
);

const Button = ({ onClick, disabled, children }) => (
  <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

const Card = ({ children, className }) => (
  <div className={`border p-4 rounded shadow-md ${className}`}>{children}</div>
);

const CardContent = ({ children }) => <div>{children}</div>;

export default function StockAnalyzer() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStockData = async () => {
    setLoading(true);
    const response = await fetch(`http://127.0.0.1:5000/analyze?ticker=${ticker}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      console.error("Error fetching stock data:", response.statusText);
      setLoading(false);
      return;
    }

    const result = await response.json();
    setData(result);
    setLoading(false);
  };

  // Function to format AI Analysis
  const formatAnalysis = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "\n$1") // Add new line before bold text
      .split("\n")
      .map((line, index) => (
        <p key={index} className={line.startsWith("**") ? "font-bold" : ""}>
          {line}
        </p>
      ));
  };

  return (
      <div className="app-container">
        {/* Links Section - Now at the very top */}
        <div className="links-container">
          {/* Left Links */}
          <div className="left-links">
            <a href={`https://finance.yahoo.com/quote/${ticker || ""}`} target="_blank" rel="noopener noreferrer">Yahoo Finance</a>
            <a href={`https://www.tradingview.com/chart/?symbol=${ticker || ""}`} target="_blank" rel="noopener noreferrer">TradingView</a>
            <a href={`https://www.investopedia.com/markets/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">Investopedia</a>
            <a href={`https://robinhood.com/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">Robinhood</a>
          </div>

          {/* Right Links */}
          <div className="right-links">
            <a href={`https://www.tipranks.com/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">TipRanks</a>
            <a href={`https://www.zacks.com/stock/quote/${ticker || ""}`} target="_blank" rel="noopener noreferrer">Zacks</a>
            <a href={`https://www.nasdaq.com/market-activity/stocks/${ticker || ""}`} target="_blank" rel="noopener noreferrer">Nasdaq</a>
            <a href={`http://openinsider.com/search?q=${ticker || ""}`} target="_blank" rel="noopener noreferrer">OpenInsider</a>
            {ticker && (
              <a href={`https://stockinvest.us/stock/${ticker}`} target="_blank" rel="noopener noreferrer">
                StockInvest
              </a>
            )}
          </div>
        </div>
      
      {/* Main Content */}
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">Stock Analyzer</h1>
        <div className="flex gap-2 mb-4">
          <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Enter Stock Ticker" />
          <Button onClick={fetchStockData} disabled={loading}>{loading ? "Loading..." : "Analyze"}</Button>
        </div>

        {/* AI Analysis Section - Directly Below Search Bar */}
        {data && (
          <Card className="bg-gradient-to-l from-gray-100 to-gray-300 mt-4">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">AI Analysis:</h2>
              <div className="text-gray-700">{formatAnalysis(data.analysis)}</div>
            </CardContent>
          </Card>
        )}

        {/* Stock Data - Gradient Background */}
        {data && (
          <Card className="bg-gradient-to-r from-gray-100 to-gray-300 mt-4">
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold">{data.ticker} Analysis</h2>
              <p>RSI: {data.rsi.toFixed(2)} | P/E Ratio {data.pe_ratio.toFixed(2)}</p> 
              <p>MACD: {data.macd.toFixed(2)} | Signal: {data.signal.toFixed(2)}</p>
              <p>50-day SMA: {data.sma_50.toFixed(2)} | 200-day SMA: {data.sma_200.toFixed(2)}</p>

              {data.history && data.history["1y"] && (
                <LineChart width={600} height={300} data={data.history["1y"]}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Close" stroke="#8884d8" />
                </LineChart>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
