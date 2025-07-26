// app/portfolio/page.tsx
import PortfolioTickerTable from "@/components/portfolio";

export default function PortfolioPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Portfolio Watchlist</h1>
      <PortfolioTickerTable />
    </main>
  );
}
