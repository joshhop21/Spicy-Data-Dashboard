import { NextRequest, NextResponse } from "next/server";
import {
  CHART_RANGES,
  formatMetricValue,
  getMetricById,
  type ChartRange,
} from "@/lib/company-metrics";
import { fetchMetricHistory } from "@/lib/yahoo-finance";
import type { ChartDataFile } from "@/lib/types";

export const dynamic = "force-dynamic";

function rangeToYahoo(range: string): string {
  const found = CHART_RANGES.find((r) => r.key === range);
  return found?.yahoo ?? "1y";
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const metricId = request.nextUrl.searchParams.get("metric")?.trim().toLowerCase();
  const range = (request.nextUrl.searchParams.get("range")?.trim().toUpperCase() ?? "1Y") as ChartRange;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!metricId) {
    return NextResponse.json({ error: "Missing metric" }, { status: 400 });
  }

  const metric = getMetricById(metricId);
  if (!metric) {
    return NextResponse.json({ error: `Unknown metric: ${metricId}` }, { status: 400 });
  }

  try {
    const yahooRange = rangeToYahoo(range);
    const { points, currency } = await fetchMetricHistory(symbol, metricId, yahooRange);

    const seriesKey = "value";
    const chartPoints = points.map((p) => ({ date: p.date, [seriesKey]: p.value }));

    const latest = points[points.length - 1]!;
    const prev = points.length > 1 ? points[points.length - 2]! : latest;
    const delta = latest.value - prev.value;
    const deltaPct = prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : 0;

    const payload: ChartDataFile = {
      slug: `${symbol}-${metricId}`,
      updatedAt: new Date().toISOString(),
      headline: {
        value: formatMetricValue(latest.value, metric.format, currency),
        delta: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
        deltaDate: latest.date,
        deltaPositive: delta >= 0,
      },
      series: [
        {
          key: seriesKey,
          label: metric.label,
          color: metric.accentColor,
          type: "area",
        },
      ],
      points: chartPoints,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load chart";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
