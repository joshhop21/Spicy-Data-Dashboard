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

/** Hide Recharts' positioned tooltip shell so it never covers active dots. */
export const hiddenTooltipWrapper = {
  visibility: "hidden" as const,
  pointerEvents: "none" as const,
};

const ACTIVE_DOT = { r: 5, stroke: "#fff", strokeWidth: 2.5 };

export const chartActiveDot = ACTIVE_DOT;

const CHART_GAP = 10;

function getCalloutDimensions(compact: boolean, rowCount: number) {
  const boxWidth = compact ? 172 : 216;
  const headerH = compact ? 18 : 20;
  const rowH = compact ? 17 : 19;
  const padV = compact ? 22 : 26;
  const boxHeight = padV + headerH + rowCount * rowH;
  return { boxWidth, boxHeight };
}

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

  const { boxWidth, boxHeight } = getCalloutDimensions(compact, hover.rows.length);
  const { anchor } = hover;

  const placeRight = anchor.x < width * 0.55;
  const boxLeft = placeRight ? width + CHART_GAP : -boxWidth - CHART_GAP;
  const boxTop = Math.max(
    CHART_GAP,
    Math.min(height - boxHeight - CHART_GAP, anchor.y - boxHeight / 2),
  );
  const boxMidY = boxTop + boxHeight / 2;
  const lineEndX = placeRight ? boxLeft : boxLeft + boxWidth;

  const svgLeft = Math.min(0, boxLeft);
  const svgWidth = Math.max(width, boxLeft + boxWidth) - svgLeft;
  const anchorX = anchor.x - svgLeft;
  const lineX = lineEndX - svgLeft;

  const boxPad = compact ? "p-2.5 text-[11px]" : "p-3 text-xs";

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <svg
        className="absolute top-0 overflow-visible"
        style={{ left: svgLeft, width: svgWidth, height }}
        aria-hidden
      >
        <line
          x1={anchorX}
          y1={anchor.y}
          x2={lineX}
          y2={boxMidY}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
      <div
        className={`absolute rounded-lg border border-stone-200 bg-white shadow-lg ${boxPad}`}
        style={{
          left: boxLeft,
          top: boxTop,
          width: boxWidth,
          minHeight: boxHeight,
        }}
        aria-live="polite"
      >
        <p className="font-medium leading-snug text-stone-800">{formatHoverDate(hover.date)}</p>
        {hover.rows.map((row) => (
          <p
            key={row.label}
            className="mt-1 tabular-nums leading-snug"
            style={{ color: row.color ?? "#57534e" }}
          >
            {row.label}: {row.value}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatHoverDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
