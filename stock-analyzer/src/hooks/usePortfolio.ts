// src/hooks/usePortfolio.ts
import { useState, useEffect } from "react";

const API = "https://api.aranish.uk/portfolio";
const headers = {
  "Content-Type": "application/json",
};

export function usePortfolio(email: string) {
  const [tickers, setTickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickers = async () => {
    const res = await fetch(`${API}/${email}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch");
    setTickers(data.tickers);
    setLoading(false);
  };

  const addTicker = async (ticker: string, frequency: string) => {
    const res = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, ticker, frequency }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Add failed");
    setTickers((prev) => [...prev, data]);
  };

  const deleteTicker = async (ticker: string) => {
    const res = await fetch(API, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ email, ticker }),
    });
    if (!res.ok) throw new Error("Delete failed");
    setTickers((prev) => prev.filter((t) => t.ticker !== ticker));
  };

  const updateFrequency = async (ticker: string, frequency: string) => {
    const res = await fetch(API, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ email, ticker, frequency }),
    });
    if (!res.ok) throw new Error("Update failed");
    setTickers((prev) =>
      prev.map((t) => (t.ticker === ticker ? { ...t, frequency } : t))
    );
  };

  useEffect(() => {
    if (email) fetchTickers();
  }, [email]);

  return { tickers, loading, addTicker, deleteTicker, updateFrequency };
}
