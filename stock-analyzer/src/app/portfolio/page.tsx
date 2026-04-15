"use client";

import PortfolioTickerTable from "@/components/portfolio";
import { useAuth } from "@/hooks/useAuth";

export default function PortfolioPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Portfolio Watchlist</h1>
      {!user && (
        <p className="text-sm text-muted-foreground">
          Please login to add or remove tickers.
        </p>
      )}
      <PortfolioTickerTable userId={user?.id} />
    </main>
  );
}
