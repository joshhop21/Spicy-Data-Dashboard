import type { TileConfig } from "./types";

/** Phase 1 flagship tiles — order matches the reference grid */
export const TILES: TileConfig[] = [
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

export const LEGEND_ITEMS = [
  { label: "Distressed / CDCI", color: "#c45c4a" },
  { label: "Gold / Berkshire / BTC", color: "#b8860b" },
  { label: "Hash rate / Olive", color: "#6b7c4c" },
  { label: "CPI / Blue", color: "#4a6fa5" },
];
