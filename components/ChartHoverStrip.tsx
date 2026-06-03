"use client";

import { useEffect } from "react";
import type { TooltipProps } from "recharts";

export type HoverRow = { label: string; value: string; color?: string };
export type ChartHoverState = { date: string; rows: HoverRow[] } | null;

type SyncProps = TooltipProps<number, string> & {
  onHover: (state: ChartHoverState) => void;
  labelMap: Record<string, string>;
  formatValue: (v: number) => string;
};

/** Renders nothing — pushes hover data to a strip above the chart. */
export function ChartHoverSync({
  active,
  payload,
  label,
  onHover,
  labelMap,
  formatValue,
}: SyncProps) {
  useEffect(() => {
    if (!active || !payload?.length) {
      onHover(null);
      return;
    }
    onHover({
      date: String(label),
      rows: payload
        .filter((e) => e.value != null && Number.isFinite(Number(e.value)))
        .map((e) => {
          const key = String(e.dataKey);
          return {
            label: labelMap[key] ?? key,
            value: formatValue(Number(e.value)),
            color: e.color,
          };
        }),
    });
  }, [active, payload, label, onHover, labelMap, formatValue]);

  return null;
}

export function ChartHoverStrip({
  hover,
  compact = true,
}: {
  hover: ChartHoverState;
  compact?: boolean;
}) {
  const height = compact ? "h-[18px]" : "h-5";
  const text = compact ? "text-[10px] leading-[18px]" : "text-xs leading-5";

  if (!hover) {
    return <div className={`${height} shrink-0`} aria-hidden />;
  }

  return (
    <div
      className={`${height} shrink-0 truncate px-0.5 ${text} text-stone-600`}
      aria-live="polite"
    >
      <span className="font-medium text-stone-700">{formatHoverDate(hover.date)}</span>
      {hover.rows.map((row) => (
        <span key={row.label}>
          {" · "}
          <span style={row.color ? { color: row.color } : undefined}>
            {row.label}: {row.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function formatHoverDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
