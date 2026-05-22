import type { TileConfig } from "./types";

/** Phase 1 — six flagship Porter & Co. charts */
export const PHASE_1_TILES: TileConfig[] = [
  {
    slug: "marty-distressed",
    title: "Marty's Distressed Debt Ratio",
    subtitle: "% of HY bonds at distressed levels",
    icon: "📉",
    accentColor: "#c45c4a",
    status: "WEAKENING",
  },
  {
    slug: "cdci",
    title: "Credit Default Cycle Index",
    subtitle: "Consumer credit basket vs. gold",
    icon: "⚖️",
    accentColor: "#c45c4a",
  },
  {
    slug: "berkshire-roe",
    title: "Berkshire Rolling 10yr ROE",
    subtitle: "% change in BVPS, 1982–2024",
    icon: "🏛️",
    accentColor: "#b8860b",
  },
  {
    slug: "btc-hash-rate",
    title: "BTC Price vs. Hash Rate",
    subtitle: "Price (USD) vs. network security (EH/s)",
    icon: "₿",
    accentColor: "#b8860b",
  },
  {
    slug: "inflation-70s",
    title: "Inflation Today vs. 1970s",
    subtitle: "CPI YoY overlay",
    icon: "📊",
    accentColor: "#4a6fa5",
  },
  {
    slug: "gold-fair-value",
    title: "Gold Fair Value Algorithm",
    subtitle: "Model FV vs. actual $/oz",
    icon: "🥇",
    accentColor: "#b8860b",
  },
];

/** Phase 2 — extended index (first four) */
export const PHASE_2_TILES: TileConfig[] = [
  {
    slug: "hy-oas",
    title: "High Yield OAS Spread",
    subtitle: "ICE BofA US HY index OAS",
    icon: "📊",
    accentColor: "#c45c4a",
  },
  {
    slug: "m2-yoy",
    title: "M2 Money Supply YoY",
    subtitle: "Broad money growth signal",
    icon: "💵",
    accentColor: "#4a6fa5",
  },
  {
    slug: "yield-2s10s",
    title: "2s10s Yield Curve",
    subtitle: "10Y − 2Y Treasury spread",
    icon: "📐",
    accentColor: "#6b7c4c",
  },
  {
    slug: "private-credit-stress",
    title: "Private Credit Stress Index",
    subtitle: "BDC discount-to-NAV vs. HY OAS",
    icon: "🏦",
    accentColor: "#c45c4a",
  },
];

/** All tiles (detail routes, data loading) */
export const TILES: TileConfig[] = [...PHASE_1_TILES, ...PHASE_2_TILES];

export const LEGEND_ITEMS = [
  { label: "Distressed / CDCI / HY", color: "#c45c4a" },
  { label: "Gold / Berkshire / BTC", color: "#b8860b" },
  { label: "Hash rate / Curve", color: "#6b7c4c" },
  { label: "CPI / M2", color: "#4a6fa5" },
];
