"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
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

const VIEWPORT_MARGIN = 10;
const CHART_GAP = 10;

type CalloutLayout = {
  boxLeft: number;
  boxTop: number;
  boxWidth: number;
  boxHeight: number;
  lineEndX: number;
  lineEndY: number;
};

function getCalloutDimensions(compact: boolean, rowCount: number) {
  const boxWidth = compact ? 172 : 216;
  const headerH = compact ? 18 : 20;
  const rowH = compact ? 17 : 19;
  const padV = compact ? 22 : 26;
  const boxHeight = padV + headerH + rowCount * rowH;
  return { boxWidth, boxHeight };
}

function boxEdgeTowardPoint(
  box: { left: number; top: number; width: number; height: number },
  point: { x: number; y: number },
) {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  if (Math.abs(dx) * box.height > Math.abs(dy) * box.width) {
    const x = dx > 0 ? box.left : box.left + box.width;
    const y = Math.max(box.top, Math.min(box.top + box.height, point.y));
    return { x, y };
  }

  const y = dy > 0 ? box.top : box.top + box.height;
  const x = Math.max(box.left, Math.min(box.left + box.width, point.x));
  return { x, y };
}

function computeCalloutLayout(
  anchor: { x: number; y: number },
  plotWidth: number,
  plotHeight: number,
  containerRect: DOMRect,
  compact: boolean,
  rowCount: number,
): CalloutLayout {
  const { boxWidth, boxHeight } = getCalloutDimensions(compact, rowCount);

  const placeRight = anchor.x < plotWidth * 0.55;
  let boxLeft = placeRight ? plotWidth + CHART_GAP : -boxWidth - CHART_GAP;
  let boxTop = Math.max(
    CHART_GAP,
    Math.min(plotHeight - boxHeight - CHART_GAP, anchor.y - boxHeight / 2),
  );

  let vpLeft = containerRect.left + boxLeft;
  let vpTop = containerRect.top + boxTop;

  vpLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(window.innerWidth - boxWidth - VIEWPORT_MARGIN, vpLeft),
  );
  vpTop = Math.max(
    VIEWPORT_MARGIN,
    Math.min(window.innerHeight - boxHeight - VIEWPORT_MARGIN, vpTop),
  );

  boxLeft = vpLeft - containerRect.left;
  boxTop = vpTop - containerRect.top;

  const edge = boxEdgeTowardPoint(
    { left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight },
    anchor,
  );

  return {
    boxLeft,
    boxTop,
    boxWidth,
    boxHeight,
    lineEndX: edge.x,
    lineEndY: edge.y,
  };
}

export function ChartSideCallout({
  hover,
  width,
  height,
  compact = true,
  containerRef,
}: {
  hover: ChartHoverState;
  width: number;
  height: number;
  compact?: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  const [layout, setLayout] = useState<CalloutLayout | null>(null);

  useLayoutEffect(() => {
    if (!hover || !containerRef.current) {
      setLayout(null);
      return;
    }

    const update = () => {
      if (!containerRef.current || !hover) return;
      const rect = containerRef.current.getBoundingClientRect();
      setLayout(
        computeCalloutLayout(hover.anchor, width, height, rect, compact, hover.rows.length),
      );
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [hover, width, height, compact, containerRef]);

  if (!hover || !layout) return null;

  const boxPad = compact ? "p-2.5 text-[11px]" : "p-3 text-xs";

  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 top-0 overflow-visible"
        width={width}
        height={height}
        aria-hidden
      >
        <line
          x1={hover.anchor.x}
          y1={hover.anchor.y}
          x2={layout.lineEndX}
          y2={layout.lineEndY}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
      <div
        className={`absolute z-30 rounded-lg border border-stone-200 bg-white shadow-lg ${boxPad}`}
        style={{
          left: layout.boxLeft,
          top: layout.boxTop,
          width: layout.boxWidth,
          minHeight: layout.boxHeight,
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
    </>
  );
}

function formatHoverDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
