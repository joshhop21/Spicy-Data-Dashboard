import type { ChartDataFile } from "./types";

import martyDistressed from "@/data/marty-distressed.json";
import cdci from "@/data/cdci.json";
import berkshireRoe from "@/data/berkshire-roe.json";
import btcHashRate from "@/data/btc-hash-rate.json";
import inflation70s from "@/data/inflation-70s.json";
import goldFairValue from "@/data/gold-fair-value.json";
import hyOas from "@/data/hy-oas.json";
import m2Yoy from "@/data/m2-yoy.json";
import yield2s10s from "@/data/yield-2s10s.json";
import privateCreditStress from "@/data/private-credit-stress.json";

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
  "hy-oas": parseChartData(hyOas as ChartDataFile),
  "m2-yoy": parseChartData(m2Yoy as ChartDataFile),
  "yield-2s10s": parseChartData(yield2s10s as ChartDataFile),
  "private-credit-stress": parseChartData(privateCreditStress as ChartDataFile),
};

export function getChartData(slug: string): ChartDataFile | undefined {
  return DATA_BY_SLUG[slug];
}

export function getAllChartData(): Record<string, ChartDataFile> {
  return DATA_BY_SLUG;
}
