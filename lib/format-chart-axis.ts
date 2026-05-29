/** Compact axis tick labels for Recharts (handles negatives and billions). */

export type AxisFormat = "currency" | "percent" | "ratio" | "number" | "compact";

export function formatChartAxisValue(n: number, format: AxisFormat = "compact"): string {
  if (!Number.isFinite(n)) return "—";

  if (format === "percent") {
    return `${Math.round(n)}%`;
  }
  if (format === "ratio") {
    return `${n.toFixed(1)}x`;
  }
  if (format === "number") {
    const abs = Math.abs(n);
    if (abs >= 100) return n.toFixed(0);
    return n.toFixed(1);
  }

  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e4) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  if (abs >= 1000) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs < 10 ? abs.toFixed(1) : Math.round(abs).toString()}`;
}
