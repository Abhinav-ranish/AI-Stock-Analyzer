"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export type PortfolioEntry = {
  id: string;
  ticker: string;
  frequency: string;
  user_id: string;
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

    const { data, error: fetchError } = await getSupabase()
      .from("portfolio")
      .select("*")
      .eq("user_id", userId)
      .order("ticker", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setTickers([]);
    } else {
      setTickers(data || []);
      setError(null);
    }
    setLoading(false);
  };

  const addTicker = async (ticker: string, frequency: string) => {
    if (!userId) throw new Error("Not authenticated");

    const { data: existing } = await getSupabase()
      .from("portfolio")
      .select("id")
      .eq("user_id", userId)
      .eq("ticker", ticker)
      .single();

    if (existing) throw new Error("Stock already exists");

    const { data, error: insertError } = await getSupabase()
      .from("portfolio")
      .insert({ user_id: userId, ticker, frequency })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    setTickers((prev) => [...prev, data]);
    return data;
  };

  const deleteTicker = async (ticker: string) => {
    if (!userId) throw new Error("Not authenticated");

    const { error: deleteError } = await getSupabase()
      .from("portfolio")
      .delete()
      .eq("user_id", userId)
      .eq("ticker", ticker);

    if (deleteError) throw new Error(deleteError.message);
    setTickers((prev) => prev.filter((t) => t.ticker !== ticker));
  };

  const updateFrequency = async (ticker: string, frequency: string) => {
    if (!userId) throw new Error("Not authenticated");

    const { error: updateError } = await getSupabase()
      .from("portfolio")
      .update({ frequency })
      .eq("user_id", userId)
      .eq("ticker", ticker);

    if (updateError) throw new Error(updateError.message);
    setTickers((prev) =>
      prev.map((t) => (t.ticker === ticker ? { ...t, frequency } : t))
    );
  };

  useEffect(() => {
    fetchTickers();
  }, [userId]);

  return { tickers, loading, error, addTicker, deleteTicker, updateFrequency };
}
