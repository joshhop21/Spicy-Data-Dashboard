/** npx tsx scripts/test-fields.ts */
import { fetchMetricHistory } from "../lib/yahoo-finance";

async function main() {
  for (const metric of [
    "ts-amortization",
    "ts-interest-expense",
    "ts-capital-expenditure",
    "revenue",
  ]) {
    const r = await fetchMetricHistory("AAPL", metric, "max");
    console.log(
      metric,
      r.points.length,
      r.unavailable ? `UNAVAILABLE: ${r.unavailable.slice(0, 60)}...` : "OK",
      r.dataNote ?? "",
    );
  }
}

main();
