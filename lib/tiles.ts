import type { TileConfig } from "./types";
import { TILE_DESCRIPTIONS } from "./glossary";

function tile(partial: TileConfig): TileConfig {
  return {
    ...partial,
    description: partial.description ?? TILE_DESCRIPTIONS[partial.slug],
  };
}

export const PHASE_1_TILES: TileConfig[] = [
  tile({
    slug: "marty-distressed",
    title: "Marty's Distressed Debt Ratio",
    subtitle: "% of HY bonds at distressed levels",
    icon: "📉",
    accentColor: "#c45c4a",
    status: "WEAKENING",
  }),
  tile({
    slug: "cdci",
    title: "Credit Default Cycle Index",
    subtitle: "Consumer credit basket vs. gold",
    icon: "⚖️",
    accentColor: "#c45c4a",
  }),
  tile({
    slug: "berkshire-roe",
    title: "Berkshire Rolling 10yr ROE",
    subtitle: "% change in BVPS, 1982–2024",
    icon: "🏛️",
    accentColor: "#b8860b",
  }),
  tile({
    slug: "btc-hash-rate",
    title: "BTC Price vs. Hash Rate",
    subtitle: "Price (USD) vs. network security (EH/s)",
    icon: "₿",
    accentColor: "#b8860b",
  }),
  tile({
    slug: "inflation-70s",
    title: "Inflation Today vs. 1970s",
    subtitle: "CPI YoY overlay",
    icon: "📊",
    accentColor: "#4a6fa5",
  }),
  tile({
    slug: "gold-fair-value",
    title: "Gold Fair Value Algorithm",
    subtitle: "Model FV vs. actual $/oz",
    icon: "🥇",
    accentColor: "#b8860b",
  }),
];

export const PHASE_2_TILES: TileConfig[] = [
  tile({
    slug: "hy-oas",
    title: "High Yield OAS Spread",
    subtitle: "ICE BofA US HY index OAS",
    icon: "📊",
    accentColor: "#c45c4a",
  }),
  tile({
    slug: "m2-yoy",
    title: "M2 Money Supply YoY",
    subtitle: "Broad money growth signal",
    icon: "💵",
    accentColor: "#4a6fa5",
  }),
  tile({
    slug: "yield-2s10s",
    title: "2s10s Yield Curve",
    subtitle: "10Y − 2Y Treasury spread",
    icon: "📐",
    accentColor: "#6b7c4c",
  }),
  tile({
    slug: "private-credit-stress",
    title: "Private Credit Stress Index",
    subtitle: "BDC discount-to-NAV vs. HY OAS",
    icon: "🏦",
    accentColor: "#c45c4a",
  }),
];

export const TILES: TileConfig[] = [...PHASE_1_TILES, ...PHASE_2_TILES];

export const LEGEND_ITEMS = [
  { label: "Distressed / CDCI / HY", color: "#c45c4a" },
  { label: "Gold / Berkshire / BTC", color: "#b8860b" },
  { label: "Hash rate / Curve", color: "#6b7c4c" },
  { label: "CPI / M2", color: "#4a6fa5" },
];
