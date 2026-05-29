import { yahooFetch, YAHOO_UA } from "../lib/yahoo-auth";

async function main() {
  const period1 = Math.floor(new Date("2019-01-01").getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const type =
    "quarterlyTotalRevenue,quarterlyOperatingIncome,quarterlyOperatingCashFlow,quarterlyCapitalExpenditure";
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/AAPL?period1=${period1}&period2=${period2}&type=${encodeURIComponent(type)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    cache: "no-store",
  });
  console.log("status", res.status);
  const json = await res.json();
  const results = json?.timeseries?.result ?? [];
  console.log("series count", results.length);
  for (const r of results) {
    const key = Object.keys(r).find((k) => k !== "meta" && k !== "timestamp");
    const n = r.timestamp?.length ?? 0;
    const last = key && r[key]?.[n - 1]?.reportedValue?.raw;
    console.log(key, "points", n, "last", last);
  }
}

main().catch(console.error);
