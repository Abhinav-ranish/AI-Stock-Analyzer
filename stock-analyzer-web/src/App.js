import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// UI Components
const Input = ({ value, onChange, placeholder }) => (
  <input className="border p-2 rounded w-full" value={value} onChange={onChange} placeholder={placeholder} />
);

const Button = ({ onClick, disabled, children }) => (
  <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

const Card = ({ children }) => <div className="border p-4 rounded shadow-md">{children}</div>;
const CardContent = ({ children }) => <div>{children}</div>;

export default function StockAnalyzer() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStockData = async () => {
    setLoading(true);
    const response = await fetch(`http://127.0.0.1:5000/analyze?ticker=${ticker}`, {  // ✅ Use GET request with URL parameters
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
  

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Stock Analyzer</h1>
      <div className="flex gap-2 mb-4">
        <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Enter Stock Ticker" />
        <Button onClick={fetchStockData} disabled={loading}>{loading ? "Loading..." : "Analyze"}</Button>
      </div>
      {data && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold">{data.ticker} Analysis</h2>
            <p>RSI: {data.rsi}</p>
            <p>MACD: {data.macd} | Signal: {data.signal}</p>
            <p>50-day SMA: {data.sma_50} | 200-day SMA: {data.sma_200}</p>
            <p>News Sentiment: {data.news_sentiment}</p>
            <p className="mt-2 font-semibold">AI Analysis:</p>
            <p>{data.analysis}</p>
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
  );
}
