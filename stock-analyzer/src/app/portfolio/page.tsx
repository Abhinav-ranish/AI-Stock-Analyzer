"use client";

import { useEffect, useState } from "react";
import PortfolioTickerTable from "@/components/portfolio";

export default function PortfolioPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Portfolio Watchlist</h1>
      {!token && (
        <p className="text-sm text-muted-foreground">
          Please login to add or remove tickers.
        </p>
      )}
      <PortfolioTickerTable />
    </main>
  );
}
