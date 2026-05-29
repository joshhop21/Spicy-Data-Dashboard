import yahooFinance from "yahoo-finance2";

async function main() {
  const ts = await yahooFinance.fundamentalsTimeSeries("AAPL", {
    period1: "2019-01-01",
    type: "quarterly",
    module: "all",
  });
  console.log("rows", Array.isArray(ts) ? ts.length : typeof ts);
  if (Array.isArray(ts) && ts[0]) {
    console.log("keys", Object.keys(ts[0] as object).slice(0, 30));
    const last = ts[ts.length - 1] as Record<string, unknown>;
    console.log("last date", last.date, "revenue", last.totalRevenue, "fcf", last.freeCashFlow, "opMargin", last.operatingMargin);
  }
}

main().catch(console.error);
