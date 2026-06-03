"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { formatChartAxisValue } from "@/lib/format-chart-axis";
import { seriesDescription } from "@/lib/glossary";
import type { ChartDataFile, ChartSeries } from "@/lib/types";

type MiniChartProps = {
  data: ChartDataFile;
  compact?: boolean;
};

export function MiniChart({ data, compact = true }: MiniChartProps) {
  const { slug, series, points, referenceLine, axisFormat = "compact" } = data;
  const hasDualAxis = series.some((s) => s.yAxisId === "right");
  const useArea = series.some((s) => s.type === "area");
  const ChartWrapper = useArea ? AreaChart : LineChart;
  const formatTick = (v: number) => formatChartAxisValue(v, axisFormat);
  const yAxisWidth = compact ? 44 : 52;

  const enrichedSeries = series.map((s) => ({
    ...s,
    description:
      s.description ??
      seriesDescription(slug, s.key, s.label) ??
      `${s.label} for this chart.`,
  }));

  return (
    <div className={compact ? "h-36 w-full" : "h-80 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartWrapper data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickFormatter={(v) => formatAxisDate(String(v))}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#78716c" }}
            width={yAxisWidth}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatTick(Number(v))}
          />
          {hasDualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#78716c" }}
              width={yAxisWidth}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatTick(Number(v))}
            />
          )}
          <Tooltip
            content={
              <ChartTooltip series={enrichedSeries} formatValue={formatTick} />
            }
          />
          {referenceLine && (
            <ReferenceLine
              yAxisId="left"
              y={referenceLine.value}
              stroke="#a8a29e"
              strokeDasharray="4 4"
            />
          )}
          {enrichedSeries.map((s) =>
            s.type === "area" ? (
              <Area
                key={s.key}
                yAxisId={s.yAxisId ?? "left"}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                yAxisId={s.yAxisId ?? "left"}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                dot={false}
                isAnimationActive={false}
              />
            ),
          )}
        </ChartWrapper>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  formatValue,
}: TooltipProps<number, string> & {
  series: ChartSeries[];
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="max-w-xs rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-2 font-medium text-stone-800">{formatTooltipDate(String(label))}</p>
      {payload.map((entry) => {
        const key = entry.dataKey as string;
        const meta = series.find((s) => s.key === key);
        const num = typeof entry.value === "number" ? entry.value : Number(entry.value);
        return (
          <div key={key} className="mt-1.5 border-t border-stone-100 pt-1.5 first:mt-0 first:border-0 first:pt-0">
            <p className="font-medium" style={{ color: entry.color }}>
              {meta?.label ?? key}: {formatValue(num)}
            </p>
            {meta?.description && (
              <p className="mt-0.5 leading-snug text-stone-500">{meta.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatAxisDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatTooltipDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
