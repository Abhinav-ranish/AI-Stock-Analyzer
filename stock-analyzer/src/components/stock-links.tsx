"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function StockLinks({ ticker }: { ticker: string }) {
  const safeTicker = ticker || "";

  const mainLinks = [
    ["Yahoo Finance", `https://finance.yahoo.com/quote/${safeTicker}`],
    ["Bing", `https://www.bing.com/search?q=${safeTicker}+stock`],
    ["TradingView", `https://www.tradingview.com/chart/?symbol=${safeTicker}`],
    ["TipRanks", `https://www.tipranks.com/stocks/${safeTicker}`],
    ["Zacks", `https://www.zacks.com/stock/quote/${safeTicker}`],
  ];

  const otherLinks = [
    ["Investopedia", `https://www.investopedia.com/markets/stocks/${safeTicker}`],
    ["Nasdaq", `https://www.nasdaq.com/market-activity/stocks/${safeTicker}`],
    ["OpenInsider", `http://openinsider.com/search?q=${safeTicker}`],
    ["StockInvest", `https://stockinvest.us/stock/${safeTicker}`],
    ["Robinhood", `https://robinhood.com/stocks/${safeTicker}`],
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      {mainLinks.map(([name, url], i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="text-xs px-3 py-1">
            {name}
          </Button>
        </a>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="text-xs px-3 py-1">
            Others
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {otherLinks.map(([name, url], i) => (
            <DropdownMenuItem key={i} asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" className="w-full">
                {name}
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
