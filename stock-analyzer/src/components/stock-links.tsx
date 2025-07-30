"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronRight } from "lucide-react";

const ICONS: Record<string, string> = {
  Yahoo: "yfinance.webp",
  Bing: "bing.png",
  TradingView: "tradingview.png",
  TipRanks: "tipranks.png",
  Zacks: "zacks.png",
};

export default function StockLinks({ ticker }: { ticker: string }) {
  const safeTicker = ticker || "";

  const mainLinks: { name: string; url: string }[] = [
    { name: "Yahoo", url: `https://finance.yahoo.com/quote/${safeTicker}` },
    { name: "Bing", url: `https://www.bing.com/search?q=${safeTicker}+stock` },
    {
      name: "TradingView",
      url: `https://www.tradingview.com/chart/?symbol=${safeTicker}`,
    },
    { name: "TipRanks", url: `https://www.tipranks.com/stocks/${safeTicker}` },
    { name: "Zacks", url: `https://www.zacks.com/stock/quote/${safeTicker}` }, // no icon
  ];

  const otherLinks = [
    ["OpenInsider", `http://openinsider.com/search?q=${safeTicker}`],
    ["Robinhood", `https://robinhood.com/stocks/${safeTicker}`],
    [
      "Investopedia",
      `https://www.investopedia.com/markets/stocks/${safeTicker}`,
    ],
    ["Nasdaq", `https://www.nasdaq.com/market-activity/stocks/${safeTicker}`],
    ["StockInvest", `https://stockinvest.us/stock/${safeTicker}`],
  ];

  return (
    <TooltipProvider>
      <div className="fixed left-2 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-6 z-50">
        {mainLinks.map(({ name, url }, i) => {
          const iconPath = ICONS[name];

          return iconPath ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="w-10 h-10 p-2">
                    <Image
                      src={`/toolbar/${iconPath}`}
                      alt={name}
                      width={30}
                      height={30}
                      className="object-contain"
                    />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">{name}</TooltipContent>
            </Tooltip>
          ) : (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-28"
            >
              <Button variant="outline" className="w-full text-sm">
                {name}
              </Button>
            </a>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="text-sm w-full justify-between pl-3 py-2 pr-2"
            >
              <ChevronRight className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            {otherLinks.map(([name, url], i) => (
              <DropdownMenuItem key={i} asChild>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  {name}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
