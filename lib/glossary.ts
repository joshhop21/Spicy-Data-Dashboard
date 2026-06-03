/** Plain-language definitions for dashboard terms and chart series. */

export const TILE_DESCRIPTIONS: Record<string, string> = {
  "marty-distressed":
    "What % of U.S. high-yield (junk) bonds trade at distressed spreads. Rises when the bond market is worried about defaults.",
  cdci: "Compares consumer-lender stocks to gold. When this falls, credit stocks are losing ground vs. a hard-asset benchmark.",
  "berkshire-roe":
    "How fast Berkshire Hathaway book value per share has compounded over the past 10 years — Warren Buffett’s long-run scorecard.",
  "btc-hash-rate":
    "Bitcoin price in dollars vs. network hash rate (mining power). Hash rate shows how much computing power secures the network.",
  "inflation-70s":
    "Today’s U.S. inflation (CPI) plotted against the 1970s path — helps see if we’re repeating an old inflation cycle.",
  "gold-fair-value":
    "Where our model says gold should trade vs. where it actually trades. Above the line = gold looks rich; below = cheap.",
  "hy-oas":
    "Extra yield on risky corporate bonds vs. Treasuries (ICE BofA High Yield Index). A wider spread means investors want more pay for taking credit risk.",
  "m2-yoy":
    "How fast U.S. M2 money supply is growing year-over-year. Faster growth usually means more liquidity in the system.",
  "yield-2s10s":
    "10-year Treasury yield minus 2-year yield. When negative (inverted), short rates are above long rates — often seen before recessions.",
  "private-credit-stress":
    "Blends BDC discount-to-NAV with high-yield spreads. Tracks stress in private / direct lending outside traditional banks.",
};

export const LEGEND_DESCRIPTIONS: Record<string, string> = {
  "Distressed / CDCI / HY": "Red charts — credit risk, distressed debt, and high-yield spreads.",
  "Gold / Berkshire / BTC": "Gold charts — hard assets, Berkshire compounding, and Bitcoin.",
  "Hash rate / Curve": "Olive charts — Bitcoin hash rate and the Treasury yield curve.",
  "CPI / M2": "Blue charts — inflation (CPI) and money-supply growth (M2).",
};

export const BTC_LIQUIDITY_TERMS: Record<string, string> = {
  "Bitcoin Price":
    "Live Bitcoin price in U.S. dollars (BTC-USD), same as Google Finance or Yahoo — updates every 30 seconds.",
  "Model Signal":
    "Summary of whether Bitcoin looks cheap or expensive vs. our liquidity model, based on the latest fair-value estimate.",
  Signal:
    "Cheap = trading well below model fair value. Dear = well above. Neutral = in the middle of the normal range.",
  "Vs Fair":
    "How far today’s Bitcoin price is above or below the model’s fair-value estimate, in percent.",
  "Z-Score":
    "How unusual the current price is vs. the model. Below −1.5 = historically cheap. Above +1.5 = historically expensive.",
  "Fed Net Liquidity":
    "Fed assets minus cash in the Treasury account and reverse-repo — rough measure of liquidity the Fed has added to markets.",
  "Global M2 (USD) YoY":
    "Broad money supply growth for the U.S., Europe, Japan, China, and UK (in USD). Shows global liquidity expansion or contraction.",
  "Stablecoin Supply":
    "Total USDT + USDC in circulation — dollar-pegged tokens often sitting on crypto exchanges as ready-to-deploy cash.",
  "BTC actual":
    "Bitcoin’s weekly closing price used in this model.",
  "Model fair value":
    "Where the model thinks Bitcoin should trade, based on Fed liquidity, global M2 growth, and stablecoin supply.",
  "Likely range":
    "Shaded band where Bitcoin has usually traded relative to the model — about two-thirds of history falls inside this zone.",
  "Extreme range":
    "Wider shaded band for unusual moves — most of history stays inside, but big rallies or selloffs can pierce it.",
  "Cheap / Dear Indicator":
    "Z-score chart: how far price is from the model over time. Readings below −1.5 = cheap signal; above +1.5 = dear signal.",
};

export function seriesDescription(slug: string, seriesKey: string, _label: string): string | undefined {
  const bySlug: Record<string, Record<string, string>> = {
    "marty-distressed": {
      ratio: "Percent of high-yield bonds trading at distressed yield levels.",
    },
    cdci: {
      cdci: "Consumer credit stock basket divided by gold — indexed over time.",
      gold: "Gold price component of the ratio.",
    },
    "berkshire-roe": {
      roe: "Rolling 10-year annualized change in Berkshire book value per share.",
    },
    "btc-hash-rate": {
      btc: "Bitcoin spot price in U.S. dollars.",
      hashRate: "Network hash rate — total mining power securing Bitcoin (EH/s).",
    },
    "inflation-70s": {
      cpiNow: "Current U.S. CPI inflation, year-over-year.",
      cpi70s: "1970s CPI path shown for comparison.",
    },
    "gold-fair-value": {
      actual: "Actual gold spot price ($/oz).",
      model: "Model fair value for gold.",
    },
    "hy-oas": {
      oas: "High-yield bond spread over Treasuries (OAS), in percent.",
    },
    "m2-yoy": {
      m2yoy: "U.S. M2 money supply, year-over-year % change.",
    },
    "yield-2s10s": {
      spread: "10-year minus 2-year Treasury yield spread.",
    },
    "private-credit-stress": {
      bdcDiscount: "Average BDC discount to net asset value — how cheap private credit funds trade.",
      hyOas: "High-yield bond spread (OAS) — the public credit stress component.",
    },
  };
  return bySlug[slug]?.[seriesKey];
}
