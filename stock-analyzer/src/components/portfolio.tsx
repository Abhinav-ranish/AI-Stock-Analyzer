"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";

type TickerRow = {
  sno: number;
  ticker: string;
  name: string;
  price: string;
  frequency: string;
};

async function fetchCompanyInfo(ticker: string) {
  const res = await fetch(`https://api.aranish.uk/fundamentals/${ticker}`);
  if (!res.ok) throw new Error("Invalid ticker");
  const data = await res.json();
  return {
    name: data.industry || data.sector || "Unknown",
    price: data.pe?.toFixed(2) ?? "N/A",
  };
}

export default function PortfolioTickerTable() {
  const email =
    typeof window !== "undefined" ? localStorage.getItem("email") : null;

  const { tickers, loading, addTicker, deleteTicker } = usePortfolio(email || "");
  const [input, setInput] = useState("");
  const [data, setData] = useState<TickerRow[]>([]);

  useEffect(() => {
    if (!loading && tickers.length) {
      const processed = tickers.map((t, i) => ({
        sno: i + 1,
        ticker: t.ticker,
        frequency: t.frequency,
        name: "Loading...",
        price: "Loading...",
      }));
      setData(processed);

      tickers.forEach(async (t, i) => {
        try {
          const { name, price } = await fetchCompanyInfo(t.ticker);
          setData((prev) =>
            prev.map((row) =>
              row.ticker === t.ticker ? { ...row, name, price } : row
            )
          );
        } catch {
          setData((prev) =>
            prev.map((row) =>
              row.ticker === t.ticker
                ? { ...row, name: "Error", price: "Error" }
                : row
            )
          );
        }
      });
    }
  }, [tickers, loading]);

  const handleAdd = async () => {
    const ticker = input.trim().toUpperCase();
    if (!ticker || !email) return;

    const placeholder: TickerRow = {
      sno: data.length + 1,
      ticker,
      name: "Loading...",
      price: "Loading...",
      frequency: "weekly", // default
    };

    setData((prev) => [...prev, placeholder]);
    setInput("");

    try {
      await addTicker(ticker, "weekly");
      const { name, price } = await fetchCompanyInfo(ticker);
      setData((prev) =>
        prev.map((row) =>
          row.ticker === ticker ? { ...row, name, price } : row
        )
      );
    } catch (err) {
      toast.error("Invalid ticker or backend error");

      // Show error in UI
      setData((prev) =>
        prev.map((row) =>
          row.ticker === ticker
            ? { ...row, name: "Error", price: "Error" }
            : row
        )
      );

      // Auto-remove
      setTimeout(() => {
        setData((prev) =>
          prev
            .filter((row) => row.ticker !== ticker)
            .map((row, i) => ({ ...row, sno: i + 1 }))
        );
      }, 2000);
    }
  };

  const handleDelete = async (index: number) => {
    const ticker = data[index].ticker;
    try {
      await deleteTicker(ticker);
      const updated = data.filter((_, i) => i !== index);
      setData(updated.map((row, i) => ({ ...row, sno: i + 1 })));
    } catch {
      toast.error("Failed to delete ticker");
    }
  };

  const columns: ColumnDef<TickerRow>[] = [
    { accessorKey: "sno", header: "S.No" },
    { accessorKey: "ticker", header: "Ticker" },
    { accessorKey: "name", header: "Industry" },
    { accessorKey: "price", header: "Company Price" },
    {
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="destructive"
          onClick={() => handleDelete(row.index)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter ticker (e.g. AAPL)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={handleAdd} disabled={!email}>
          Add Ticker
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        setPageNum={() => {}}
        currentPage={0}
        totalCount={{ totalElements: data.length, totalPages: 1 }}
        showSearch={false}
        placeHolder={false}
      />
    </div>
  );
}
