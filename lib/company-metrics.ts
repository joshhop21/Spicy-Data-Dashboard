export type MetricFormat = "currency" | "percent" | "ratio" | "number" | "compact";

export type MetricDefinition = {
  id: string;
  label: string;
  subtitle: string;
  keywords: string[];
  icon: string;
  accentColor: string;
  format: MetricFormat;
  /** Built-in charts shown on every company page */
  default?: boolean;
};

export const COMPANY_METRICS: MetricDefinition[] = [
  {
    id: "price",
    label: "Stock Price",
    subtitle: "Daily close",
    keywords: ["price", "stock", "share", "close"],
    icon: "📈",
    accentColor: "#b8860b",
    format: "currency",
    default: true,
  },
  {
    id: "pe",
    label: "P/E Ratio",
    subtitle: "Price ÷ trailing EPS (quarterly)",
    keywords: ["pe", "p/e", "price earnings", "multiple", "valuation"],
    icon: "📊",
    accentColor: "#4a6fa5",
    format: "ratio",
    default: true,
  },
  {
    id: "revenue",
    label: "Total Revenue",
    subtitle: "Quarterly revenue",
    keywords: ["revenue", "sales", "top line", "total revenue"],
    icon: "💰",
    accentColor: "#c45c4a",
    format: "compact",
    default: true,
  },
  {
    id: "revenue-growth",
    label: "Revenue Growth YoY",
    subtitle: "Year-over-year % change",
    keywords: ["revenue growth", "revenue g", "sales growth", "yoy revenue"],
    icon: "📈",
    accentColor: "#c45c4a",
    format: "percent",
  },
  {
    id: "net-income",
    label: "Net Income",
    subtitle: "Quarterly net income",
    keywords: ["net income", "earnings", "profit", "bottom line"],
    icon: "💵",
    accentColor: "#6b7c4c",
    format: "compact",
  },
  {
    id: "gross-profit",
    label: "Gross Profit",
    subtitle: "Quarterly gross profit",
    keywords: ["gross profit", "gross margin", "gp"],
    icon: "🏦",
    accentColor: "#b8860b",
    format: "compact",
  },
  {
    id: "eps",
    label: "Earnings Per Share",
    subtitle: "Quarterly EPS",
    keywords: ["eps", "earnings per share", "diluted eps"],
    icon: "🧮",
    accentColor: "#4a6fa5",
    format: "number",
  },
  {
    id: "operating-margin",
    label: "Operating Margin",
    subtitle: "Operating income ÷ revenue",
    keywords: ["operating margin", "op margin", "operating income margin"],
    icon: "📐",
    accentColor: "#6b7c4c",
    format: "percent",
  },
  {
    id: "free-cash-flow",
    label: "Free Cash Flow",
    subtitle: "Quarterly FCF",
    keywords: ["free cash flow", "fcf", "cash flow"],
    icon: "💸",
    accentColor: "#4a6fa5",
    format: "compact",
  },
];

export const DEFAULT_METRIC_IDS = COMPANY_METRICS.filter((m) => m.default).map((m) => m.id);

export type ChartRange = "1Y" | "3Y" | "5Y" | "ALL";

export const CHART_RANGES: { key: ChartRange; yahoo: string }[] = [
  { key: "1Y", yahoo: "1y" },
  { key: "3Y", yahoo: "3y" },
  { key: "5Y", yahoo: "5y" },
  { key: "ALL", yahoo: "max" },
];

export function getMetricById(id: string): MetricDefinition | undefined {
  return COMPANY_METRICS.find((m) => m.id === id);
}

export function searchMetrics(query: string, limit = 8): MetricDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return COMPANY_METRICS.filter((m) => {
    const haystack = [m.label, m.subtitle, ...m.keywords].join(" ").toLowerCase();
    return haystack.includes(q) || m.keywords.some((k) => k.includes(q) || q.includes(k.split(" ")[0]!));
  })
    .slice(0, limit)
    .sort((a, b) => {
      const aLabel = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bLabel = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aLabel - bLabel;
    });
}

export function formatMetricValue(value: number, format: MetricFormat, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    case "percent":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "ratio":
      return `${value.toFixed(1)}x`;
    case "compact":
      if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      return `$${value.toLocaleString()}`;
    default:
      return value.toFixed(2);
  }
}
