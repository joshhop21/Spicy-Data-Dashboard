/** Server-only metric search + lookup (includes full Yahoo timeseries catalog). */

import {
  COMPANY_METRICS,
  type MetricDefinition,
} from "@/lib/company-metrics";
import { TIMESERIES_METRICS } from "@/lib/yahoo-timeseries-catalog";

export const ALL_METRICS: MetricDefinition[] = [
  ...COMPANY_METRICS,
  ...TIMESERIES_METRICS.map((m) => ({ ...m })),
];

export function getMetricById(id: string): MetricDefinition | undefined {
  return ALL_METRICS.find((m) => m.id === id);
}

function scoreMetric(m: MetricDefinition, q: string): number {
  const label = m.label.toLowerCase();
  const mid = m.id.toLowerCase();
  if (label === q || mid === q) return 0;
  if (label.startsWith(q)) return 1;
  if (mid.includes(q.replace(/\s+/g, "-"))) return 2;
  const haystack = [m.label, m.subtitle, m.id, ...m.keywords].join(" ").toLowerCase();
  if (haystack.includes(q)) return 3;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((t) => haystack.includes(t))) return 4;
  return 99;
}

export function searchMetrics(query: string, limit = 20): MetricDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return ALL_METRICS.filter((m) => scoreMetric(m, q) < 99)
    .sort((a, b) => scoreMetric(a, q) - scoreMetric(b, q))
    .slice(0, limit);
}
