"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

export type TickerRow = {
  sno: number;
  ticker: string;
  name: string;
  price: string;
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
  const [input, setInput] = useState("");
  const [data, setData] = useState<TickerRow[]>([]);

  const handleAdd = async () => {
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;

    // Placeholder
    const placeholder: TickerRow = {
      sno: data.length + 1,
      ticker,
      name: "Loading...",
      price: "Loading...",
    };
    setData((prev) => [...prev, placeholder]);
    setInput("");

    try {
      const { name, price } = await fetchCompanyInfo(ticker);
      setData((prev) =>
        prev.map((row) =>
          row.ticker === ticker ? { ...row, name, price } : row
        )
      );
    } catch {
      // Auto-remove invalid entry
      setTimeout(() => {
        setData((prev) =>
          prev
            .filter((row) => row.ticker !== ticker)
            .map((row, i) => ({ ...row, sno: i + 1 }))
        );
      }, 2000);

      // Show toast
      toast("Invalid ticker");
      toast.error("Failed to fetch company info");
      toast.success("Ticker added successfully");

      // Show temporary error in UI
      setData((prev) =>
        prev.map((row) =>
          row.ticker === ticker
            ? { ...row, name: "Error", price: "Error" }
            : row
        )
      );
    }
  };

  const handleDelete = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    setData(updated.map((row, i) => ({ ...row, sno: i + 1 })));
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
        <Button onClick={handleAdd}>Add Ticker</Button>
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
