import { NextRequest, NextResponse } from "next/server";
import { CHART_RANGES, formatMetricValue, type ChartRange } from "@/lib/company-metrics";
import { getMetricById } from "@/lib/company-metrics-server";
import { fetchMetricHistory } from "@/lib/yahoo-finance";
import type { ChartDataFile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

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
    const isYoyGrowth = metricId === "revenue-growth";

    if (isYoyGrowth && range === "1Y") {
      const { points, currency } = await fetchMetricHistory(symbol, metricId, "max");
      const latest = points[points.length - 1];
      const prevPt = points.length > 1 ? points[points.length - 2]! : undefined;
      let deltaStr = "Chart: use 3Y+";
      let deltaPositive: boolean | undefined;
      if (latest && prevPt && prevPt.value !== 0) {
        const deltaPct = ((latest.value - prevPt.value) / Math.abs(prevPt.value)) * 100;
        deltaStr = `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs prior year`;
        deltaPositive = deltaPct >= 0;
      }
      const payload: ChartDataFile = {
        slug: `${symbol}-${metricId}`,
        updatedAt: new Date().toISOString(),
        axisFormat: metric.format,
        unavailable:
          "Year-over-year growth needs at least 2 years of history. Select 3Y, 5Y, or ALL.",
        headline: {
          value: latest
            ? formatMetricValue(latest.value, metric.format, currency)
            : "N/A",
          delta: deltaStr,
          deltaDate: latest?.date ?? "",
          deltaPositive,
        },
        series: [
          {
            key: "value",
            label: metric.label,
            color: metric.accentColor,
            type: "area",
          },
        ],
        points: [],
      };
      return NextResponse.json(payload);
    }

    const history = await fetchMetricHistory(symbol, metricId, yahooRange);
    const { points, currency, unavailable, dataNote } = history;

    const seriesKey = "value";
    const chartPoints = points.map((p) => ({ date: p.date, [seriesKey]: p.value }));

    if (unavailable && chartPoints.length === 0) {
      const payload: ChartDataFile = {
        slug: `${symbol}-${metricId}`,
        updatedAt: new Date().toISOString(),
        axisFormat: metric.format,
        unavailable,
        dataNote,
        headline: {
          value: "Not reported",
          delta: "—",
          deltaDate: "",
        },
        series: [
          {
            key: seriesKey,
            label: metric.label,
            color: metric.accentColor,
            type: "area",
          },
        ],
        points: [],
      };
      return NextResponse.json(payload);
    }

    if (isYoyGrowth && chartPoints.length < 2) {
      const latest = points[points.length - 1];
      const payload: ChartDataFile = {
        slug: `${symbol}-${metricId}`,
        updatedAt: new Date().toISOString(),
        axisFormat: metric.format,
        unavailable: "Not enough YoY history for this range. Try ALL.",
        headline: {
          value: latest ? formatMetricValue(latest.value, metric.format, currency) : "N/A",
          delta: "—",
          deltaDate: latest?.date ?? "",
        },
        series: [
          {
            key: seriesKey,
            label: metric.label,
            color: metric.accentColor,
            type: "area",
          },
        ],
        points: [],
      };
      return NextResponse.json(payload);
    }

    const latest = points[points.length - 1]!;
    const prev = points.length > 1 ? points[points.length - 2]! : latest;
    const delta = latest.value - prev.value;
    const deltaPct = prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : 0;

    const payload: ChartDataFile = {
      slug: `${symbol}-${metricId}`,
      updatedAt: new Date().toISOString(),
      axisFormat: metric.format,
      dataNote,
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
    const metric = getMetricById(metricId);
    const payload: ChartDataFile = {
      slug: `${symbol}-${metricId}`,
      updatedAt: new Date().toISOString(),
      axisFormat: metric?.format ?? "compact",
      unavailable:
        "We could not reach Yahoo Finance right now. Try again in a moment or pick a different metric.",
      headline: { value: "—", delta: "—", deltaDate: "" },
      series: [
        {
          key: "value",
          label: metric?.label ?? metricId,
          color: metric?.accentColor ?? "#78716c",
          type: "area",
        },
      ],
      points: [],
    };
    return NextResponse.json(payload);
  }
}
