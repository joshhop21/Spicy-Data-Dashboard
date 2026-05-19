import type { ChartDataFile } from "./types";

import martyDistressed from "@/data/marty-distressed.json";
import cdci from "@/data/cdci.json";
import berkshireRoe from "@/data/berkshire-roe.json";
import btcHashRate from "@/data/btc-hash-rate.json";
import inflation70s from "@/data/inflation-70s.json";
import goldFairValue from "@/data/gold-fair-value.json";

/** Normalize JSON imports (null referenceLine, loose series types) for TypeScript */
function parseChartData(raw: ChartDataFile): ChartDataFile {
  const { referenceLine, ...rest } = raw;
  return {
    ...rest,
    ...(referenceLine != null ? { referenceLine } : {}),
  };
}

const DATA_BY_SLUG: Record<string, ChartDataFile> = {
  "marty-distressed": parseChartData(martyDistressed as ChartDataFile),
  cdci: parseChartData(cdci as ChartDataFile),
  "berkshire-roe": parseChartData(berkshireRoe as ChartDataFile),
  "btc-hash-rate": parseChartData(btcHashRate as ChartDataFile),
  "inflation-70s": parseChartData(inflation70s as ChartDataFile),
  "gold-fair-value": parseChartData(goldFairValue as ChartDataFile),
};

export function getChartData(slug: string): ChartDataFile | undefined {
  return DATA_BY_SLUG[slug];
}

export function getAllChartData(): Record<string, ChartDataFile> {
  return DATA_BY_SLUG;
}
