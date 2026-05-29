/** Searchable catalog of Yahoo fundamentals timeseries fields. */

import timeseriesKeys from "@/lib/yahoo-timeseries-keys.json";

export type MetricFormat = "currency" | "percent" | "ratio" | "number" | "compact";

export type TimeseriesMetricDefinition = {
  id: string;
  label: string;
  subtitle: string;
  keywords: string[];
  icon: string;
  accentColor: string;
  format: MetricFormat;
  timeseriesKey: string;
  timeseriesModule: string;
};

const MODULE_LABELS: Record<string, string> = {
  financials: "Income statement",
  "balance-sheet": "Balance sheet",
  "cash-flow": "Cash flow",
};

const MODULE_COLORS: Record<string, string> = {
  financials: "#c45c4a",
  "balance-sheet": "#6b7c4c",
  "cash-flow": "#4a6fa5",
};

const MODULE_ICONS: Record<string, string> = {
  financials: "📊",
  "balance-sheet": "🏦",
  "cash-flow": "💸",
};

function pascalToCamel(key: string): string {
  return key.charAt(0).toLowerCase() + key.slice(1);
}

function pascalToKebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function pascalToLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim();
}

function inferFormat(camelKey: string): MetricFormat {
  const k = camelKey.toLowerCase();
  if (k.includes("margin") || k.includes("rate") || k.endsWith("ratio")) return "percent";
  if (k.includes("eps") || k.includes("pershare") || k.includes("dividend")) return "number";
  return "compact";
}

function buildCatalog(): TimeseriesMetricDefinition[] {
  const out: TimeseriesMetricDefinition[] = [];

  for (const [module, keys] of Object.entries(timeseriesKeys)) {
    if (!Array.isArray(keys)) continue;
    const moduleLabel = MODULE_LABELS[module] ?? module;
    const color = MODULE_COLORS[module] ?? "#78716c";
    const icon = MODULE_ICONS[module] ?? "📈";

    for (const pascalKey of keys) {
      const camelKey = pascalToCamel(pascalKey);
      const id = `ts-${pascalToKebab(pascalKey)}`;
      const label = pascalToLabel(pascalKey);

      out.push({
        id,
        label,
        subtitle: `${moduleLabel} · quarterly`,
        keywords: [
          label.toLowerCase(),
          camelKey,
          pascalKey.toLowerCase(),
          pascalToKebab(pascalKey).replace(/-/g, " "),
          module.replace("-", " "),
        ],
        icon,
        accentColor: color,
        format: inferFormat(camelKey),
        timeseriesKey: camelKey,
        timeseriesModule: module,
      });
    }
  }

  return out;
}

export const TIMESERIES_METRICS: TimeseriesMetricDefinition[] = buildCatalog();

export function getTimeseriesMetricById(id: string): TimeseriesMetricDefinition | undefined {
  return TIMESERIES_METRICS.find((m) => m.id === id);
}

export function getTimeseriesKey(metricId: string): string | undefined {
  return getTimeseriesMetricById(metricId)?.timeseriesKey;
}
