/** Yahoo fundamentals timeseries API — no cookie/crumb required. */

import timeseriesKeys from "@/lib/yahoo-timeseries-keys.json";
import { getFallbackKeys } from "@/lib/yahoo-metric-fallbacks";
import { YAHOO_UA } from "@/lib/yahoo-auth";

export type HistoryPoint = { date: string; value: number };

export type ResolvedSeries = {
  points: HistoryPoint[];
  resolvedKey?: string;
  period?: "quarterly" | "annual";
  note?: string;
};

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

const BATCH_SIZE = 24;

type FundamentalsCache = {
  expiresAt: number;
  series: Map<string, HistoryPoint[]>;
};

const cache = new Map<string, FundamentalsCache>();
const fieldCache = new Map<string, { expiresAt: number; points: HistoryPoint[] }>();
const CACHE_MS = 60_000;

function camelToPascal(camel: string): string {
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

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

async function fetchTypesRaw(
  symbol: string,
  types: string[],
): Promise<Map<string, HistoryPoint[]>> {
  if (!types.length) return new Map();

  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor(
    new Date(new Date().setFullYear(new Date().getFullYear() - 12)).getTime() / 1000,
  );
  const type = types.join(",");
  const url = `${BASE}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&type=${encodeURIComponent(type)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return new Map();
  }

  return parseTimeseriesResponse(await res.json());
}

function cacheFieldPoints(cacheKey: string, points: HistoryPoint[]) {
  fieldCache.set(cacheKey, { points, expiresAt: Date.now() + CACHE_MS });
}

export async function fetchTimeseriesModule(
  symbol: string,
  module: keyof typeof timeseriesKeys,
  periodType: "quarterly" | "annual" = "quarterly",
): Promise<Map<string, HistoryPoint[]>> {
  const key = symbol.toUpperCase();
  const cacheKey = `${key}:${periodType}:module:${module}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) return hit.series;

  const pascalKeys = (timeseriesKeys[module] as string[]) ?? [];
  const types = pascalKeys.map((p) => `${periodType}${p}`);
  const merged = new Map<string, HistoryPoint[]>();

  for (let i = 0; i < types.length; i += BATCH_SIZE) {
    const batch = types.slice(i, i + BATCH_SIZE);
    const batchMap = await fetchTypesRaw(key, batch);
    for (const [k, v] of batchMap) {
      merged.set(k, v);
      cacheFieldPoints(`${key}:${periodType}:${k}`, v);
    }
  }

  cache.set(cacheKey, { series: merged, expiresAt: Date.now() + CACHE_MS });
  return merged;
}

export async function fetchTimeseriesMetric(
  symbol: string,
  camelKey: string,
  periodType: "quarterly" | "annual" = "quarterly",
): Promise<HistoryPoint[]> {
  const key = symbol.toUpperCase();
  const cacheKey = `${key}:${periodType}:${camelKey}`;
  const hit = fieldCache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) return hit.points;

  if (periodType === "quarterly") {
    try {
      const bundled = await getFundamentalsSeries(key);
      const existing = bundled.get(camelKey);
      if (existing?.length) return existing;
    } catch {
      /* continue */
    }
  }

  const type = `${periodType}${camelToPascal(camelKey)}`;
  const map = await fetchTypesRaw(key, [type]);
  const points = [...(map.get(camelKey) ?? [])];
  cacheFieldPoints(cacheKey, points);
  return points;
}

export async function resolveTimeseriesMetric(
  symbol: string,
  camelKey: string,
  options?: { fallbacks?: string[]; module?: string },
): Promise<ResolvedSeries> {
  const sym = symbol.toUpperCase();
  const keys = [camelKey, ...(options?.fallbacks ?? getFallbackKeys(camelKey))];
  const uniqueKeys = [...new Set(keys)];

  for (const period of ["quarterly", "annual"] as const) {
    for (const key of uniqueKeys) {
      const points = await fetchTimeseriesMetric(sym, key, period);
      if (points.length > 0) {
        const note =
          key !== camelKey
            ? `Showing ${formatKeyLabel(key)} (closest reported line item).`
            : period === "annual"
              ? "Annual data — quarterly not reported for this company."
              : undefined;
        return { points, resolvedKey: key, period, note };
      }
    }
  }

  if (options?.module && options.module in timeseriesKeys) {
    for (const period of ["quarterly", "annual"] as const) {
      const mod = await fetchTimeseriesModule(
        sym,
        options.module as keyof typeof timeseriesKeys,
        period,
      );
      for (const key of uniqueKeys) {
        const points = mod.get(key) ?? [];
        if (points.length > 0) {
          return {
            points,
            resolvedKey: key,
            period,
            note:
              key !== camelKey
                ? `Showing ${formatKeyLabel(key)} (closest reported line item).`
                : period === "annual"
                  ? "Annual data — quarterly not reported for this company."
                  : undefined,
          };
        }
      }
    }
  }

  return { points: [] };
}

function formatKeyLabel(camelKey: string): string {
  return camelKey.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export async function getFundamentalsSeries(symbol: string): Promise<Map<string, HistoryPoint[]>> {
  const key = symbol.toUpperCase();
  const hit = cache.get(`${key}:quarterly:bundle`);
  if (hit && Date.now() < hit.expiresAt) return hit.series;

  const map = await fetchTypesRaw(key, [...QUARTERLY_TYPES]);
  cache.set(`${key}:quarterly:bundle`, { series: map, expiresAt: Date.now() + CACHE_MS });
  for (const [k, v] of map) {
    cacheFieldPoints(`${key}:quarterly:${k}`, v);
  }
  return map;
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
    out.push({ date: c.date, value: c.value + x });
  }

  return out;
}

export function yoyGrowthSeries(
  series: HistoryPoint[],
  periodsBack = 4,
): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = periodsBack; i < series.length; i++) {
    const prev = series[i - periodsBack]!.value;
    const curr = series[i]!.value;
    if (prev === 0) continue;
    out.push({ date: series[i]!.date, value: (curr / prev - 1) * 100 });
  }
  return out;
}

export function qoqGrowthSeries(quarterly: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = 1; i < quarterly.length; i++) {
    const prev = quarterly[i - 1]!.value;
    const curr = quarterly[i]!.value;
    if (prev === 0) continue;
    out.push({ date: quarterly[i]!.date, value: (curr / prev - 1) * 100 });
  }
  return out;
}

export async function buildRevenueGrowthSeries(symbol: string): Promise<HistoryPoint[]> {
  const annualRev = await fetchTimeseriesMetric(symbol, "totalRevenue", "annual");
  let points = yoyGrowthSeries(annualRev, 1);
  if (points.length >= 2) return points;

  const quarterlyRev = await fetchTimeseriesMetric(symbol, "totalRevenue", "quarterly");
  points = yoyGrowthSeries(quarterlyRev, 4);
  if (points.length >= 2) return points;

  return qoqGrowthSeries(quarterlyRev);
}

export function trailingEpsFromQuarterly(eps: HistoryPoint[]): number | null {
  if (!eps.length) return null;
  const recent = eps.slice(-4);
  const sum = recent.reduce((acc, p) => acc + p.value, 0);
  return sum > 0 ? sum : null;
}
