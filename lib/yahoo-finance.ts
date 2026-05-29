/** Server-side Yahoo Finance helpers. */

import {
  freeCashFlowSeries,
  getFundamentalsSeries,
  mergePointsByDate,
  ratioSeries,
  seriesFromMap,
  trailingEpsFromQuarterly,
  yoyGrowthSeries,
  type HistoryPoint,
} from "@/lib/yahoo-fundamentals-ts";
import { fetchQuoteSummary } from "@/lib/yahoo-quote-summary";
import { YAHOO_UA } from "@/lib/yahoo-auth";

export type { HistoryPoint };

export async function fetchPriceHistory(
  symbol: string,
  range: string,
): Promise<{ points: HistoryPoint[]; currency: string }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const currency: string = result?.meta?.currency ?? "USD";

  const points: HistoryPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    points.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      value: close,
    });
  }
  if (points.length === 0) throw new Error("No price history");
  return { points, currency };
}

type RawStatement = {
  endDate?: { raw?: number };
  totalRevenue?: { raw?: number };
  netIncome?: { raw?: number };
  grossProfit?: { raw?: number };
  operatingIncome?: { raw?: number };
  freeCashflow?: { raw?: number };
};

type EarningsRow = {
  period?: string;
  epsActual?: { raw?: number };
};

function statementPoints(
  rows: RawStatement[] | undefined,
  field: keyof RawStatement,
): HistoryPoint[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => {
      const ts = row.endDate?.raw;
      const val = row[field] as { raw?: number } | undefined;
      if (ts == null || val?.raw == null) return null;
      return {
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        value: val.raw,
      };
    })
    .filter((p): p is HistoryPoint => p != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function mergeStatements(...lists: (RawStatement[] | undefined)[]): RawStatement[] {
  const map = new Map<number, RawStatement>();
  for (const rows of lists) {
    for (const row of rows ?? []) {
      const ts = row.endDate?.raw;
      if (ts != null) map.set(ts, row);
    }
  }
  return [...map.values()].sort((a, b) => (a.endDate?.raw ?? 0) - (b.endDate?.raw ?? 0));
}

function nearestPriceOnOrBefore(pricePoints: HistoryPoint[], targetDate: string): number | null {
  let best: number | null = null;
  for (const p of pricePoints) {
    if (p.date <= targetDate) best = p.value;
    else break;
  }
  return best;
}

function applyRangeFilter(points: HistoryPoint[], range: string): HistoryPoint[] {
  if (range === "max" || points.length === 0) return points;

  const years = range === "1y" ? 1 : range === "3y" ? 3 : range === "5y" ? 5 : 10;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = points.filter((p) => p.date >= cutoffStr);

  // Quarterly fundamentals are sparse — never return empty after filtering.
  return filtered.length > 0 ? filtered : points;
}

async function loadStatementFallback(symbol: string): Promise<{
  income: RawStatement[];
  cashflow: RawStatement[];
  earnings: EarningsRow[];
  trailingEps: number | null;
  trailingPe: number | null;
}> {
  try {
    const summary = await fetchQuoteSummary(symbol);
    const income = mergeStatements(
      summary.incomeStatementHistory?.incomeStatementHistory,
      summary.incomeStatementHistoryQuarterly?.incomeStatementHistory,
    );
    const cashflow = mergeStatements(
      summary.cashflowStatementHistory?.cashflowStatementHistory,
      summary.cashflowStatementHistoryQuarterly?.cashflowStatementHistory,
    );
    const trailingEps =
      summary.defaultKeyStatistics?.trailingEps ??
      summary.financialData?.epsTrailingTwelveMonths ??
      null;
    const trailingPe =
      summary.financialData?.trailingPE ?? summary.defaultKeyStatistics?.trailingPE ?? null;

    return {
      income,
      cashflow,
      earnings: summary.earningsHistory?.history ?? [],
      trailingEps: typeof trailingEps === "number" ? trailingEps : trailingEps?.raw ?? null,
      trailingPe: typeof trailingPe === "number" ? trailingPe : trailingPe?.raw ?? null,
    };
  } catch {
    return { income: [], cashflow: [], earnings: [], trailingEps: null, trailingPe: null };
  }
}

export async function fetchPeHistory(symbol: string, range: string): Promise<HistoryPoint[]> {
  const [{ points: prices }, ts, fallback] = await Promise.all([
    fetchPriceHistory(symbol, range),
    getFundamentalsSeries(symbol).catch(() => new Map<string, HistoryPoint[]>()),
    loadStatementFallback(symbol),
  ]);

  const quarterlyEps = seriesFromMap(ts, "dilutedEPS");
  const trailingEps =
    trailingEpsFromQuarterly(quarterlyEps) ?? fallback.trailingEps;

  if (trailingEps != null && trailingEps !== 0 && prices.length > 0) {
    return prices.map((p) => ({ date: p.date, value: p.value / trailingEps }));
  }

  const pePoints: HistoryPoint[] = [];
  for (const row of fallback.earnings) {
    const eps = row.epsActual?.raw;
    const period = row.period;
    if (eps == null || !period || eps === 0) continue;
    const price = nearestPriceOnOrBefore(prices, period);
    if (price == null) continue;
    pePoints.push({ date: period, value: price / eps });
  }

  if (pePoints.length === 0 && fallback.trailingPe != null) {
    pePoints.push({ date: new Date().toISOString().slice(0, 10), value: fallback.trailingPe });
  }

  if (pePoints.length === 0) throw new Error("No P/E data");
  return pePoints.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchMetricHistory(
  symbol: string,
  metricId: string,
  range: string,
): Promise<{ points: HistoryPoint[]; currency: string }> {
  if (metricId === "price") {
    return fetchPriceHistory(symbol, range);
  }

  if (metricId === "pe") {
    const points = applyRangeFilter(await fetchPeHistory(symbol, range), range);
    return { points, currency: "USD" };
  }

  const [ts, fallback] = await Promise.all([
    getFundamentalsSeries(symbol),
    loadStatementFallback(symbol),
  ]);

  let points: HistoryPoint[] = [];

  switch (metricId) {
    case "revenue":
      points = mergePointsByDate(
        seriesFromMap(ts, "totalRevenue"),
        statementPoints(fallback.income, "totalRevenue"),
      );
      break;
    case "net-income":
      points = mergePointsByDate(
        seriesFromMap(ts, "netIncome"),
        statementPoints(fallback.income, "netIncome"),
      );
      break;
    case "gross-profit":
      points = mergePointsByDate(
        seriesFromMap(ts, "grossProfit"),
        statementPoints(fallback.income, "grossProfit"),
      );
      break;
    case "revenue-growth":
      points = yoyGrowthSeries(
        mergePointsByDate(
          seriesFromMap(ts, "totalRevenue"),
          statementPoints(fallback.income, "totalRevenue"),
        ),
      );
      break;
    case "eps": {
      const fromTs = seriesFromMap(ts, "dilutedEPS");
      if (fromTs.length) {
        points = fromTs;
      } else {
        points = fallback.earnings
          .map((row) => {
            if (!row.period || row.epsActual?.raw == null) return null;
            return { date: row.period, value: row.epsActual.raw };
          })
          .filter((p): p is HistoryPoint => p != null)
          .sort((a, b) => a.date.localeCompare(b.date));
      }
      break;
    }
    case "operating-margin": {
      const op = seriesFromMap(ts, "operatingIncome");
      const rev = seriesFromMap(ts, "totalRevenue");
      points = ratioSeries(op, rev, 100);

      if (!points.length) {
        points = fallback.income
          .map((row) => {
            const r = row.totalRevenue?.raw;
            const o = row.operatingIncome?.raw;
            const ts = row.endDate?.raw;
            if (r == null || o == null || ts == null || r === 0) return null;
            return {
              date: new Date(ts * 1000).toISOString().slice(0, 10),
              value: (o / r) * 100,
            };
          })
          .filter((p): p is HistoryPoint => p != null);
      }
      break;
    }
    case "free-cash-flow": {
      const ocf = seriesFromMap(ts, "operatingCashFlow");
      const capex = seriesFromMap(ts, "capitalExpenditure");
      points = freeCashFlowSeries(ocf, capex);

      if (!points.length) {
        points = statementPoints(fallback.cashflow, "freeCashflow");
      }
      break;
    }
    default:
      throw new Error(`Unknown metric: ${metricId}`);
  }

  points = applyRangeFilter(points, range);

  if (points.length === 0) throw new Error(`No data for ${metricId}`);
  return { points, currency: "USD" };
}
