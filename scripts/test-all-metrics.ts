/** npx tsx scripts/test-all-metrics.ts */
import { fetchMetricHistory } from "../lib/yahoo-finance";

const metrics = [
  "price",
  "pe",
  "revenue",
  "revenue-growth",
  "net-income",
  "gross-profit",
  "eps",
  "operating-margin",
  "free-cash-flow",
];

async function main() {
  for (const m of metrics) {
    try {
      const { points } = await fetchMetricHistory("AAPL", m, "max");
      console.log(m.padEnd(18), "OK", String(points.length).padStart(3), "pts", points.at(-1)?.date);
    } catch (e) {
      console.log(m.padEnd(18), "FAIL", e instanceof Error ? e.message : e);
    }
  }
}

main();
