/** Plain-language definitions for dashboard terms and chart series. */

export const TILE_DESCRIPTIONS: Record<string, string> = {
  "marty-distressed":
    "Share of U.S. high-yield bonds trading at distressed spreads (typically 1,000+ bps over Treasuries). Rises when credit stress is building.",
  cdci: "Equal-weight basket of consumer-credit-related stocks divided by gold. Tracks whether consumer credit is outperforming a hard-money benchmark.",
  "berkshire-roe":
    "Rolling 10-year annualized change in Berkshire Hathaway book value per share — a long-run compounding yardstick.",
  "btc-hash-rate":
    "Bitcoin spot price (USD) overlaid with network hash rate (EH/s). Hash rate reflects mining security and long-run network investment.",
  "inflation-70s":
    "Current U.S. CPI year-over-year inflation compared with the 1970s path — context for whether inflation is re-accelerating.",
  "gold-fair-value":
    "Model-implied fair value for gold versus the actual spot price, based on macro inputs in the Porter algorithm.",
  "hy-oas":
    "Option-adjusted spread on the ICE BofA U.S. High Yield Index — the premium investors demand to hold junk bonds over Treasuries.",
  "m2-yoy":
    "Year-over-year growth in U.S. M2 money supply. Faster growth often coincides with easier financial conditions.",
  "yield-2s10s":
    "10-year minus 2-year Treasury yield spread. Inversions (negative) often precede recessions; steepening can signal recovery expectations.",
  "private-credit-stress":
    "Combines BDC discount-to-NAV with high-yield spreads to gauge stress in private / direct lending markets.",
};

export const LEGEND_DESCRIPTIONS: Record<string, string> = {
  "Distressed / CDCI / HY": "Credit-risk and distressed-debt themed charts (red family).",
  "Gold / Berkshire / BTC": "Hard-asset, compounding, and Bitcoin-related charts (gold family).",
  "Hash rate / Curve": "Network / yield-curve macro signals (olive family).",
  "CPI / M2": "Inflation and liquidity growth charts (blue family).",
};

export const BTC_LIQUIDITY_TERMS: Record<string, string> = {
  "Bitcoin Price":
    "Live BTC-USD spot price from Yahoo Finance — the same ticker you would search on Google Finance.",
  "Model Signal":
    "Where Bitcoin trades versus the liquidity-model fair value, plus whether the model reads cheap, fair, or dear.",
  Signal:
    "Cheap = well below fair value; Dear = well above. Based on how far price sits from the model relative to history.",
  "Vs Fair":
    "Percent difference between actual Bitcoin price and the model’s fair-value estimate on the latest date.",
  "Z-Score":
    "How many standard deviations the log-price residual is from zero. Below −1.5 = unusually cheap vs the model; above +1.5 = unusually dear.",
  "Fed Net Liquidity":
    "Fed balance sheet assets minus Treasury General Account and reverse-repo (RRP) — a proxy for net liquidity injected into the banking system.",
  "Global M2 (USD) YoY":
    "Combined broad money supply for the U.S., euro area, Japan, China, and UK, converted to USD and shown as year-over-year growth.",
  "Stablecoin Supply":
    "Total circulating USDT + USDC — crypto-native dollar liquidity often used as dry powder on exchanges.",
  "BTC actual":
    "Weekly Bitcoin closing price in U.S. dollars from the model dataset.",
  "Model fair value":
    "Regression estimate of fair BTC price from Fed net liquidity, global M2 growth, and stablecoin supply.",
  "Likely range":
    "Band where price has historically traded about 68% of the time (one standard deviation above/below the model).",
  "Extreme range":
    "Wider band capturing roughly 95% of historical deviations (two standard deviations). Not a hard floor/ceiling.",
  "Cheap / Dear Indicator":
    "Z-score of the model residual. Values below −1.5 suggest Bitcoin is cheap vs liquidity conditions; above +1.5 suggests expensive.",
};

export function seriesDescription(slug: string, seriesKey: string, label: string): string | undefined {
  const bySlug: Record<string, Record<string, string>> = {
    "marty-distressed": {
      value: "Percent of the HY index trading at distressed yield levels.",
    },
    cdci: {
      value: "Indexed level of the consumer credit basket relative to gold.",
    },
    "btc-hash-rate": {
      price: "Bitcoin USD price.",
      hashRate: "Estimated network hash rate in exahashes per second.",
    },
    "m2-yoy": {
      value: "Year-over-year percent change in U.S. M2.",
    },
  };
  return bySlug[slug]?.[seriesKey] ?? bySlug[slug]?.value;
}
