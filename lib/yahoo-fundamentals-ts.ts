/** Yahoo fundamentals timeseries API — no cookie/crumb required. */

import { YAHOO_UA } from "@/lib/yahoo-auth";

export type HistoryPoint = { date: string; value: number };

const BASE =
  "https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries";

const QUARTERLY_TYPES = [
  "quarterlyTotalRevenue",
  "quarterlyNetIncome",
  "quarterlyGrossProfit",
  "quarterlyDilutedEPS",
  "quarterlyOperatingIncome",
  "quarterlyOperatingCashFlow",
  "quarterlyCapitalExpenditure",
] as const;

type FundamentalsCache = {
  expiresAt: number;
  series: Map<string, HistoryPoint[]>;
};

const cache = new Map<string, FundamentalsCache>();
const CACHE_MS = 60_000;

function toCamelKey(dataKey: string): string {
  const short = dataKey.replace(/^(quarterly|annual|trailing)/, "");
  return short.charAt(0).toLowerCase() + short.slice(1);
}

function parseTimeseriesResponse(json: unknown): Map<string, HistoryPoint[]> {
  const map = new Map<string, HistoryPoint[]>();
  const results =
    (json as { timeseries?: { result?: Record<string, unknown>[] } })?.timeseries
      ?.result ?? [];

  for (const result of results) {
    const dataKey = Object.keys(result).find((k) => k !== "meta" && k !== "timestamp");
    const timestamps = result.timestamp as number[] | undefined;
    if (!dataKey || !timestamps?.length) continue;

    const values = result[dataKey] as
      | { reportedValue?: { raw?: number } }[]
      | undefined;

    const points: HistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const raw = values?.[i]?.reportedValue?.raw;
      if (raw == null || !Number.isFinite(raw)) continue;
      points.push({
        date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
        value: raw,
      });
    }

    if (points.length) {
      points.sort((a, b) => a.date.localeCompare(b.date));
      map.set(toCamelKey(dataKey), points);
    }
  }

  return map;
}

export async function getFundamentalsSeries(symbol: string): Promise<Map<string, HistoryPoint[]>> {
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.series;

  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(new Date(new Date().setFullYear(new Date().getFullYear() - 12)).getTime() / 1000);
  const type = QUARTERLY_TYPES.join(",");

  const url = `${BASE}/${encodeURIComponent(key)}?period1=${period1}&period2=${period2}&type=${encodeURIComponent(type)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Yahoo fundamentals timeseries ${res.status}`);
  }

  const series = parseTimeseriesResponse(await res.json());
  cache.set(key, { series, expiresAt: Date.now() + CACHE_MS });
  return series;
}

export function seriesFromMap(
  map: Map<string, HistoryPoint[]>,
  key: string,
): HistoryPoint[] {
  return map.get(key) ?? [];
}

export function mergePointsByDate(...lists: HistoryPoint[][]): HistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const list of lists) {
    for (const p of list) byDate.set(p.date, p.value);
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function ratioSeries(
  numerator: HistoryPoint[],
  denominator: HistoryPoint[],
  scale = 1,
): HistoryPoint[] {
  const denomByDate = new Map(denominator.map((p) => [p.date, p.value]));
  const out: HistoryPoint[] = [];

  for (const n of numerator) {
    const d = denomByDate.get(n.date);
    if (d == null || d === 0) continue;
    out.push({ date: n.date, value: (n.value / d) * scale });
  }

  return out;
}

export function freeCashFlowSeries(
  ocf: HistoryPoint[],
  capex: HistoryPoint[],
): HistoryPoint[] {
  const capexByDate = new Map(capex.map((p) => [p.date, p.value]));
  const out: HistoryPoint[] = [];

  for (const c of ocf) {
    const x = capexByDate.get(c.date);
    if (x == null) continue;
    // Yahoo reports capex as negative cash outflow.
    out.push({ date: c.date, value: c.value + x });
  }

  return out;
}

export function yoyGrowthSeries(quarterly: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = 4; i < quarterly.length; i++) {
    const prev = quarterly[i - 4]!.value;
    const curr = quarterly[i]!.value;
    if (prev === 0) continue;
    out.push({ date: quarterly[i]!.date, value: (curr / prev - 1) * 100 });
  }
  if (out.length > 0) return out;

  // Fallback: year-over-year on annual-like sparse data (1 period back if ≥2 years apart)
  for (let i = 1; i < quarterly.length; i++) {
    const prev = quarterly[i - 1]!.value;
    const curr = quarterly[i]!.value;
    if (prev === 0) continue;
    out.push({ date: quarterly[i]!.date, value: (curr / prev - 1) * 100 });
  }
  return out;
}

export function trailingEpsFromQuarterly(eps: HistoryPoint[]): number | null {
  if (!eps.length) return null;
  const recent = eps.slice(-4);
  const sum = recent.reduce((acc, p) => acc + p.value, 0);
  return sum > 0 ? sum : null;
}
