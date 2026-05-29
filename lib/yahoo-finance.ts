/** Server-side Yahoo Finance helpers (direct HTTP — no npm package). */

import { YAHOO_UA, yahooFetch } from "@/lib/yahoo-auth";

export type HistoryPoint = { date: string; value: number };

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

async function fetchQuoteSummary(symbol: string) {
  const modules = [
    "incomeStatementHistoryQuarterly",
    "incomeStatementHistory",
    "cashflowStatementHistoryQuarterly",
    "cashflowStatementHistory",
    "earningsHistory",
    "financialData",
    "defaultKeyStatistics",
  ].join(",");

  const bases = [
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`,
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`,
  ];

  let lastStatus = 0;
  for (const base of bases) {
    const res = await yahooFetch(base);
    lastStatus = res.status;
    if (!res.ok) continue;
    const json = await res.json();
    const result = json?.quoteSummary?.result?.[0];
    if (result) return result;
  }

  throw new Error(`Yahoo quoteSummary ${lastStatus || 401}`);
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

function yoyGrowthPoints(quarterly: HistoryPoint[]): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = 4; i < quarterly.length; i++) {
    const prev = quarterly[i - 4]!.value;
    const curr = quarterly[i]!.value;
    if (prev === 0) continue;
    out.push({
      date: quarterly[i]!.date,
      value: (curr / prev - 1) * 100,
    });
  }
  return out;
}

function nearestPriceOnOrBefore(pricePoints: HistoryPoint[], targetDate: string): number | null {
  let best: number | null = null;
  for (const p of pricePoints) {
    if (p.date <= targetDate) best = p.value;
    else break;
  }
  return best;
}

export async function fetchPeHistory(symbol: string, range: string): Promise<HistoryPoint[]> {
  const [{ points: prices }, summary] = await Promise.all([
    fetchPriceHistory(symbol, range),
    fetchQuoteSummary(symbol),
  ]);

  const trailingEps =
    summary?.defaultKeyStatistics?.trailingEps?.raw ??
    summary?.financialData?.epsTrailingTwelveMonths?.raw;

  if (trailingEps != null && trailingEps !== 0 && prices.length > 0) {
    return prices.map((p) => ({ date: p.date, value: p.value / trailingEps }));
  }

  const earnings: EarningsRow[] = summary?.earningsHistory?.history ?? [];
  const pePoints: HistoryPoint[] = [];

  for (const row of earnings) {
    const eps = row.epsActual?.raw;
    const period = row.period;
    if (eps == null || !period || eps === 0) continue;
    const price = nearestPriceOnOrBefore(prices, period);
    if (price == null) continue;
    pePoints.push({ date: period, value: price / eps });
  }

  if (pePoints.length === 0) {
    const trailingPe =
      summary?.financialData?.trailingPE?.raw ??
      summary?.defaultKeyStatistics?.trailingPE?.raw;
    if (trailingPe != null) {
      pePoints.push({ date: new Date().toISOString().slice(0, 10), value: trailingPe });
    }
  }

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
    const points = await fetchPeHistory(symbol, range);
    return { points, currency: "USD" };
  }

  const summary = await fetchQuoteSummary(symbol);
  const income = mergeStatements(
    summary?.incomeStatementHistory?.incomeStatementHistory,
    summary?.incomeStatementHistoryQuarterly?.incomeStatementHistory,
  );
  const cashflow = mergeStatements(
    summary?.cashflowStatementHistory?.cashflowStatementHistory,
    summary?.cashflowStatementHistoryQuarterly?.cashflowStatementHistory,
  );

  let points: HistoryPoint[] = [];

  switch (metricId) {
    case "revenue":
      points = statementPoints(income, "totalRevenue");
      break;
    case "net-income":
      points = statementPoints(income, "netIncome");
      break;
    case "gross-profit":
      points = statementPoints(income, "grossProfit");
      break;
    case "revenue-growth":
      points = yoyGrowthPoints(statementPoints(income, "totalRevenue"));
      break;
    case "eps": {
      const earnings: EarningsRow[] = summary?.earningsHistory?.history ?? [];
      points = earnings
        .map((row) => {
          if (!row.period || row.epsActual?.raw == null) return null;
          return { date: row.period, value: row.epsActual.raw };
        })
        .filter((p): p is HistoryPoint => p != null)
        .sort((a, b) => a.date.localeCompare(b.date));
      break;
    }
    case "operating-margin": {
      points = income
        .map((row) => {
          const rev = row.totalRevenue?.raw;
          const op = row.operatingIncome?.raw;
          const ts = row.endDate?.raw;
          if (rev == null || op == null || ts == null || rev === 0) return null;
          return {
            date: new Date(ts * 1000).toISOString().slice(0, 10),
            value: (op / rev) * 100,
          };
        })
        .filter((p): p is HistoryPoint => p != null)
        .sort((a, b) => a.date.localeCompare(b.date));
      break;
    }
    case "free-cash-flow":
      points = statementPoints(cashflow, "freeCashflow");
      break;
    default:
      throw new Error(`Unknown metric: ${metricId}`);
  }

  if (points.length === 0) throw new Error(`No data for ${metricId}`);

  if (range !== "max") {
    const years = range === "1y" ? 1 : range === "3y" ? 3 : range === "5y" ? 5 : 10;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    points = points.filter((p) => p.date >= cutoffStr);
  }

  return { points, currency: "USD" };
}
