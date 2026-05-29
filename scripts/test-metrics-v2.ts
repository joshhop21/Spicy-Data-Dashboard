/** npx tsx scripts/test-metrics-v2.ts */
import { fetchMetricHistory } from "../lib/yahoo-finance";
import { searchMetrics } from "../lib/company-metrics-server";

async function main() {
  console.log("search capex:", searchMetrics("capital expenditure", 3).map((m) => m.id));
  console.log("search ebitda:", searchMetrics("ebitda", 3).map((m) => m.id));

  for (const metric of ["revenue-growth", "ts-capital-expenditure", "ts-ebitda"]) {
    try {
      const { points } = await fetchMetricHistory("AAPL", metric, "max");
      console.log(metric, "OK", points.length, "pts", points.map((p) => `${p.date}:${p.value.toFixed(1)}`).join(", "));
    } catch (e) {
      console.log(metric, "FAIL", e instanceof Error ? e.message : e);
    }
  }
}

main();
