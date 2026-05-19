import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
      };
    }>;
    error?: { description?: string };
  };
};

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SpicyDataDashboard/1.0)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance returned ${res.status}`);
    }

    const data = (await res.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) {
      return NextResponse.json({ error: `No quote found for ${symbol}` }, { status: 404 });
    }

    const price = meta.regularMarketPrice;
    const previous = meta.chartPreviousClose ?? price;
    const change = price - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

    return NextResponse.json({
      symbol: meta.symbol ?? symbol,
      price,
      change,
      changePercent,
      currency: meta.currency ?? "USD",
      asOf: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: `Could not load quote for ${symbol}. Check the ticker and try again.` },
      { status: 500 },
    );
  }
}
