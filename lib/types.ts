export type ChartPoint = {
  date: string;
  [key: string]: string | number | null | undefined;
};

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
  type?: "line" | "area";
  yAxisId?: "left" | "right";
  strokeDasharray?: string;
};

export type Constituent = {
  ticker: string;
  weight: string;
  category: string;
  status: string;
  role: string;
};

export type ChartDataFile = {
  slug: string;
  updatedAt: string;
  headline: {
    value: string;
    delta: string;
    deltaDate: string;
    deltaPositive?: boolean;
  };
  series: ChartSeries[];
  points: ChartPoint[];
  /** When set, chart area shows this instead of plotting (e.g. YoY on 1Y). */
  unavailable?: string;
  /** Footnote when data comes from a fallback line item or annual-only. */
  dataNote?: string;
  /** How to format Y-axis ticks (from metric format). */
  axisFormat?: "currency" | "percent" | "ratio" | "number" | "compact";
  referenceLine?: { value: number; label?: string } | null;
  thesis?: string;
  methodology?: string;
  sources?: string[];
  constituents?: Constituent[];
};

export type TileConfig = {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  status?: "DETERIORATING" | "WEAKENING" | "CRITICAL";
};

export type QuoteResponse = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  asOf: string;
};
