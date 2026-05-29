/** Quick local test: npx tsx scripts/test-yahoo-auth.ts */
import { fetchMetricHistory } from "../lib/yahoo-finance";

async function main() {
  for (const metric of ["price", "pe", "revenue"]) {
    try {
      const { points } = await fetchMetricHistory("AAPL", metric, "1y");
      console.log(metric, "OK", points.length, "points", "latest", points.at(-1)?.value);
    } catch (e) {
      console.log(metric, "FAIL", e instanceof Error ? e.message : e);
    }
  }
}

main();
