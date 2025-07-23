import ModeToggle from "@/components/mode-toggle";
import StockAnalyzer from "@/components/stock-analyzer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-4">
      <nav className="flex justify-between items-center mb-4 sticky top-0 bg-background z-50">
        <h1 className="text-2xl font-bold">Stock Analyzer</h1>
        <ModeToggle />
      </nav>
      <StockAnalyzer />
    </main>
  );
}



