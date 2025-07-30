import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return new Response("Missing query parameter", { status: 400 });
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=6&newsCount=0`;

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0", // Required for some edge providers
      },
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return new Response("Yahoo fetch failed", { status: 500 });
  }
}
