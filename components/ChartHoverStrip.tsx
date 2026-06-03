"use client";

import { useEffect } from "react";
import type { TooltipProps } from "recharts";

export type HoverRow = { label: string; value: string; color?: string };
export type ChartHoverState = {
  date: string;
  rows: HoverRow[];
  anchor: { x: number; y: number };
} | null;

type SyncProps = TooltipProps<number, string> & {
  onHover: (state: ChartHoverState) => void;
  labelMap: Record<string, string>;
  formatValue: (v: number) => string;
};

/** Captures hover data + plot coordinates; renders nothing in the SVG. */
export function ChartHoverSync({
  active,
  payload,
  label,
  coordinate,
  onHover,
  labelMap,
  formatValue,
}: SyncProps) {
  useEffect(() => {
    if (!active || !payload?.length || !coordinate || coordinate.x == null || coordinate.y == null) {
      onHover(null);
      return;
    }
    onHover({
      date: String(label),
      anchor: { x: coordinate.x, y: coordinate.y },
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
  }, [active, payload, label, coordinate, onHover, labelMap, formatValue]);

  return null;
}

const ACTIVE_DOT = { r: 4, stroke: "#fff", strokeWidth: 2 };

export const chartActiveDot = ACTIVE_DOT;

export function ChartSideCallout({
  hover,
  width,
  height,
  compact = true,
}: {
  hover: ChartHoverState;
  width: number;
  height: number;
  compact?: boolean;
}) {
  if (!hover) return null;

  const boxWidth = compact ? 132 : 168;
  const boxPad = compact ? "p-2 text-[10px]" : "p-2.5 text-xs";
  const rowCount = hover.rows.length;
  const boxHeight = (compact ? 28 : 32) + rowCount * (compact ? 14 : 16);
  const { anchor } = hover;

  const placeRight = anchor.x < width * 0.55;
  const boxLeft = placeRight ? width + 8 : -boxWidth - 8;
  const boxTop = Math.max(4, Math.min(height - boxHeight - 4, anchor.y - boxHeight / 2));
  const boxMidY = boxTop + boxHeight / 2;
  const lineEndX = placeRight ? width : 0;

  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={width}
        height={height}
        aria-hidden
      >
        <line
          x1={anchor.x}
          y1={anchor.y}
          x2={lineEndX}
          y2={boxMidY}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
      <div
        className={`absolute z-30 rounded-lg border border-stone-200 bg-white shadow-lg ${boxPad}`}
        style={{ left: boxLeft, top: boxTop, width: boxWidth }}
        aria-live="polite"
      >
        <p className="font-medium text-stone-800">{formatHoverDate(hover.date)}</p>
        {hover.rows.map((row) => (
          <p key={row.label} className="mt-0.5 tabular-nums" style={{ color: row.color ?? "#57534e" }}>
            {row.label}: {row.value}
          </p>
        ))}
      </div>
    </>
  );
}

function formatHoverDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
