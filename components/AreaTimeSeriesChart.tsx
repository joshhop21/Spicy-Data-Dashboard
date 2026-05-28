"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Shared area-chart styling — matches Phase 1 / Phase 2 MiniChart tiles. */
export const CHART_COLORS = {
  teal: "#0d9488",
  coral: "#c45c4a",
  amber: "#b45309",
  stone: "#a8a29e",
  bandOuter: "#d6d3d1",
  bandInner: "#e7e5e4",
} as const;

type RefLine = { y: number; label?: string };

type AreaTimeSeriesChartProps = {
  data: Record<string, unknown>[];
  dataKey: string;
  color?: string;
  heightClass?: string;
  yAxisId?: "left" | "right";
  yFormatter?: (v: number) => string;
  referenceLines?: RefLine[];
  logScale?: boolean;
};

export function AreaTimeSeriesChart({
  data,
  dataKey,
  color = CHART_COLORS.teal,
  heightClass = "h-48",
  yAxisId = "left",
  yFormatter,
  referenceLines,
  logScale = false,
}: AreaTimeSeriesChartProps) {
  return (
    <div className={`${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickFormatter={formatAxisDate}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId={yAxisId}
            scale={logScale ? "log" : undefined}
            domain={logScale ? ["auto", "auto"] : undefined}
            tick={{ fontSize: 10, fill: "#78716c" }}
            width={48}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (yFormatter ? yFormatter(Number(v)) : formatAxisNumber(Number(v)))}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e7e5e4",
            }}
            labelFormatter={(label) => String(label)}
            formatter={(value: number) =>
              yFormatter ? yFormatter(value) : formatAxisNumber(value)
            }
          />
          {referenceLines?.map((r) => (
            <ReferenceLine
              key={r.y}
              yAxisId={yAxisId}
              y={r.y}
              stroke={CHART_COLORS.stone}
              strokeDasharray="4 4"
              label={
                r.label
                  ? { value: r.label, fontSize: 10, fill: "#78716c", position: "right" }
                  : undefined
              }
            />
          ))}
          <Area
            yAxisId={yAxisId}
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatAxisDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAxisNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n * 10) / 10);
}

export { formatAxisDate, formatAxisNumber };
