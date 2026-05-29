/** Alternate Yahoo timeseries keys to try when the primary field is empty for a ticker. */

const FALLBACKS: Record<string, string[]> = {
  amortization: [
    "depreciationAndAmortization",
    "depreciationAndAmortizationInIncomeStatement",
    "amortizationOfIntangiblesIncomeStatement",
    "depreciationAmortizationDepletionIncomeStatement",
    "amortizationCashFlow",
  ],
  interestExpense: [
    "interestExpenseNonOperating",
    "interestExpenseForLongTermDebtAndCapitalSecurities",
    "interestExpenseForShortTermDebt",
  ],
  grossProfit: ["totalRevenue", "costOfRevenue"],
  operatingIncome: ["ebit", "totalOperatingIncomeAsReported"],
  freeCashFlow: ["operatingCashFlow", "capitalExpenditure"],
  ebitda: ["normalizedEBITDA", "ebit"],
  researchAndDevelopment: ["researchDevelopment"],
  netIncome: ["netIncomeCommonStockholders"],
};

export function getFallbackKeys(camelKey: string): string[] {
  const direct = FALLBACKS[camelKey];
  if (direct) return direct;

  const out: string[] = [];
  if (camelKey.includes("Amortization") && camelKey !== "amortization") {
    out.push("depreciationAndAmortization", "amortization");
  }
  if (camelKey.toLowerCase().includes("interest") && camelKey.toLowerCase().includes("expense")) {
    out.push("interestExpense", "interestExpenseNonOperating");
  }
  return [...new Set(out.filter((k) => k !== camelKey))];
}
