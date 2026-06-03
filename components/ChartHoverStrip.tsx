"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { TooltipProps } from "recharts";

export type HoverRow = {
  label: string;
  value: string;
  color?: string;
  description?: string;
};
export type ChartHoverState = {
  date: string;
  rows: HoverRow[];
  anchor: { x: number; y: number };
} | null;

type SyncProps = TooltipProps<number, string> & {
  onHover: (state: ChartHoverState) => void;
  labelMap: Record<string, string>;
  descriptionMap?: Record<string, string>;
  formatValue: (v: number) => string;
};

function hoverStateKey(state: ChartHoverState): string {
  if (!state) return "";
  return `${state.date}|${state.anchor.x}|${state.anchor.y}|${state.rows
    .map((r) => `${r.label}:${r.value}:${r.description ?? ""}`)
    .join(";")}`;
}

/** Deduped hover setter for custom Recharts tooltip sync components. */
export function useHoverSync(onHover: (state: ChartHoverState) => void) {
  const lastKeyRef = useRef("");
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  return useCallback((next: ChartHoverState) => {
    const key = hoverStateKey(next);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onHoverRef.current(next);
  }, []);
}

/** Captures hover data + plot coordinates; renders nothing in the SVG. */
export function ChartHoverSync({
  active,
  payload,
  label,
  coordinate,
  onHover,
  labelMap,
  descriptionMap,
  formatValue,
}: SyncProps) {
  const formatRef = useRef(formatValue);
  formatRef.current = formatValue;
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!active || !payload?.length || !coordinate || coordinate.x == null || coordinate.y == null) {
      if (lastKeyRef.current !== "") {
        lastKeyRef.current = "";
        onHover(null);
      }
      return;
    }

    const next: ChartHoverState = {
      date: String(label),
      anchor: { x: coordinate.x, y: coordinate.y },
      rows: payload
        .filter((e) => e.value != null && Number.isFinite(Number(e.value)))
        .map((e) => {
          const key = String(e.dataKey);
          return {
            label: labelMap[key] ?? key,
            value: formatRef.current(Number(e.value)),
            color: e.color,
            description: descriptionMap?.[key],
          };
        }),
    };

    const key = hoverStateKey(next);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onHover(next);
  }, [active, payload, label, coordinate, onHover, labelMap, descriptionMap]);

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
const VIEWPORT_MARGIN = 8;

type CalloutLayout = {
  boxLeft: number;
  boxTop: number;
  boxWidth: number;
  boxHeight: number;
  lineEndX: number;
  lineEndY: number;
  svgLeft: number;
  svgWidth: number;
  anchorX: number;
};

function rowBlockHeight(compact: boolean, hasDescription: boolean) {
  const valueLine = compact ? 18 : 20;
  const descBlock = hasDescription ? (compact ? 28 : 32) : 0;
  return valueLine + descBlock;
}

function getCalloutDimensions(compact: boolean, rows: HoverRow[]) {
  const boxWidth = compact ? 200 : 248;
  const headerH = compact ? 18 : 20;
  const padV = compact ? 22 : 26;
  const gap = compact ? 8 : 10;
  const rowsH = rows.reduce(
    (sum, row) => sum + rowBlockHeight(compact, Boolean(row.description)) + gap,
    0,
  );
  const boxHeight = padV + headerH + rowsH;
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
  rows: HoverRow[],
): CalloutLayout {
  const { boxWidth, boxHeight } = getCalloutDimensions(compact, rows);
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : containerRect.width + 200;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : containerRect.height + 200;

  let placeRight = anchor.x < plotWidth * 0.55;
  let boxLeft = placeRight ? plotWidth + CHART_GAP : -boxWidth - CHART_GAP;
  let boxTop = Math.max(
    CHART_GAP,
    Math.min(plotHeight - boxHeight - CHART_GAP, anchor.y - boxHeight / 2),
  );

  let vpLeft = containerRect.left + boxLeft;
  let vpTop = containerRect.top + boxTop;

  if (vpLeft < VIEWPORT_MARGIN) {
    placeRight = true;
    boxLeft = plotWidth + CHART_GAP;
    vpLeft = containerRect.left + boxLeft;
  }
  if (vpLeft + boxWidth > viewportWidth - VIEWPORT_MARGIN) {
    placeRight = false;
    boxLeft = -boxWidth - CHART_GAP;
    vpLeft = containerRect.left + boxLeft;
  }

  vpLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(viewportWidth - boxWidth - VIEWPORT_MARGIN, vpLeft),
  );
  vpTop = Math.max(
    VIEWPORT_MARGIN,
    Math.min(viewportHeight - boxHeight - VIEWPORT_MARGIN, vpTop),
  );

  boxLeft = vpLeft - containerRect.left;
  boxTop = vpTop - containerRect.top;

  const edge = boxEdgeTowardPoint(
    { left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight },
    anchor,
  );

  const svgLeft = Math.min(0, boxLeft, edge.x);
  const svgWidth = Math.max(1, Math.max(plotWidth, boxLeft + boxWidth, edge.x) - svgLeft);

  return {
    boxLeft,
    boxTop,
    boxWidth,
    boxHeight,
    lineEndX: edge.x,
    lineEndY: edge.y,
    svgLeft,
    svgWidth,
    anchorX: anchor.x - svgLeft,
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
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  useLayoutEffect(() => {
    if (!hover || !containerRef.current || width <= 0 || height <= 0) {
      setLayout(null);
      return;
    }

    const update = () => {
      const current = hoverRef.current;
      if (!containerRef.current || !current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setLayout(
        computeCalloutLayout(current.anchor, width, height, rect, compact, current.rows),
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
  const descClass = compact ? "text-[10px] leading-snug" : "text-[11px] leading-snug";

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      <svg
        className="absolute top-0 overflow-visible"
        style={{ left: layout.svgLeft, width: layout.svgWidth, height }}
        aria-hidden
      >
        <line
          x1={layout.anchorX}
          y1={hover.anchor.y}
          x2={layout.lineEndX - layout.svgLeft}
          y2={layout.lineEndY}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
      <div
        className={`absolute rounded-lg border border-stone-200 bg-white shadow-lg ${boxPad}`}
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
          <div key={row.label} className="mt-2">
            <p
              className="font-medium tabular-nums leading-snug"
              style={{ color: row.color ?? "#57534e" }}
            >
              {row.label}: {row.value}
            </p>
            {row.description && (
              <p className={`mt-0.5 text-stone-500 ${descClass}`}>{row.description}</p>
            )}
          </div>
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
