import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function StockAnalyzer() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStockData = async () => {
    setLoading(true);
    const response = await fetch("http://127.0.0.1:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker })
    });
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
