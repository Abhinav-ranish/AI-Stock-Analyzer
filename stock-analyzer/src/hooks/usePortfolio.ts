"use client";

import { useState, useEffect } from "react";

export type PortfolioEntry = {
  id: string;
  ticker: string;
  frequency: string;
  userId: string;
};

export function usePortfolio(userId: string | undefined) {
  const [tickers, setTickers] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickers = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch tickers");
      const data = await res.json();
      setTickers(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setTickers([]);
    } finally {
      setLoading(false);
    }
  };

  const addTicker = async (ticker: string, frequency: string) => {
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, frequency }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add ticker");
    }

    const data = await res.json();
    setTickers((prev) => [...prev, data]);
    return data;
  };

  const deleteTicker = async (ticker: string) => {
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete ticker");
    }

    setTickers((prev) => prev.filter((t) => t.ticker !== ticker));
  };

  const updateFrequency = async (ticker: string, frequency: string) => {
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, frequency }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update ticker");
    }

    setTickers((prev) =>
      prev.map((t) => (t.ticker === ticker ? { ...t, frequency } : t))
    );
  };

  useEffect(() => {
    fetchTickers();
  }, [userId]);

  return { tickers, loading, error, addTicker, deleteTicker, updateFrequency };
}
