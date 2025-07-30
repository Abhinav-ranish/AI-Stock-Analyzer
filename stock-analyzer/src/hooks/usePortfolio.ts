import { useState, useEffect } from "react";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.aranish.uk";
const API = `${baseUrl}/portfolio`;

export function usePortfolio(token: string) {
  const [tickers, setTickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeader = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchTickers = async () => {
    const res = await fetch(`${API}`, { headers: authHeader });
    const data = await res.json();
    setTickers(data || []);
    setLoading(false);
  };

  const addTicker = async (ticker: string, frequency: string) => {
    const res = await fetch(API, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ ticker, frequency }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Add failed");
    setTickers((prev) => [...prev, data]);
  };

  const deleteTicker = async (ticker: string) => {
    const res = await fetch(`${API}/${ticker}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (!res.ok) throw new Error("Delete failed");
    setTickers((prev) => prev.filter((t) => t.ticker !== ticker));
  };

  const updateFrequency = async (ticker: string, frequency: string) => {
    const res = await fetch(API, {
      method: "PATCH",
      headers: authHeader,
      body: JSON.stringify({ ticker, frequency }),
    });
    if (!res.ok) throw new Error("Update failed");
    setTickers((prev) =>
      prev.map((t) => (t.ticker === ticker ? { ...t, frequency } : t))
    );
  };

  useEffect(() => {
    if (token) fetchTickers();
  }, [token]);

  return { tickers, loading, addTicker, deleteTicker, updateFrequency };
}
