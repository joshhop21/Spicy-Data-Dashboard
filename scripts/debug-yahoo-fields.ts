import { yahooFetch } from "../lib/yahoo-auth";

async function main() {
  const modules =
    "incomeStatementHistoryQuarterly,cashflowStatementHistoryQuarterly";
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=${modules}`;
  const res = await yahooFetch(url);
  const json = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  const income = result?.incomeStatementHistoryQuarterly?.incomeStatementHistory?.[0];
  const cash = result?.cashflowStatementHistoryQuarterly?.cashflowStatementHistory?.[0];
  console.log("income keys:", income ? Object.keys(income) : "none");
  console.log("cash keys:", cash ? Object.keys(cash) : "none");
  console.log("sample income:", JSON.stringify(income, null, 2).slice(0, 800));
  console.log("sample cash:", JSON.stringify(cash, null, 2).slice(0, 800));
}

main();
