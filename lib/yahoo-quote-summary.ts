/** Server-only quoteSummary via yahoo-finance2 (handles Yahoo cookie/crumb). */

import yahooFinance from "yahoo-finance2";

yahooFinance.suppressNotices(["yahooSurvey"]);

const MODULES = [
  "incomeStatementHistoryQuarterly",
  "incomeStatementHistory",
  "cashflowStatementHistoryQuarterly",
  "cashflowStatementHistory",
  "earningsHistory",
  "financialData",
  "defaultKeyStatistics",
] as const;

type SummaryCache = { expiresAt: number; data: Awaited<ReturnType<typeof yahooFinance.quoteSummary>> };
const cache = new Map<string, SummaryCache>();
const CACHE_MS = 60_000;

export async function fetchQuoteSummary(symbol: string) {
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.data;

  const data = await yahooFinance.quoteSummary(key, {
    modules: [...MODULES],
  });

  cache.set(key, { data, expiresAt: Date.now() + CACHE_MS });
  return data;
}
