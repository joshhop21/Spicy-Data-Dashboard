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
import type { ChartDataFile } from "@/lib/types";

type MiniChartProps = {
  data: ChartDataFile;
  compact?: boolean;
};

export function MiniChart({ data, compact = true }: MiniChartProps) {
  const { series, points, referenceLine } = data;
  const hasDualAxis = series.some((s) => s.yAxisId === "right");
  const useArea = series.some((s) => s.type === "area");
  const ChartWrapper = useArea ? AreaChart : LineChart;

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
            width={compact ? 36 : 48}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatAxisNumber(Number(v))}
          />
          {hasDualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#78716c" }}
              width={compact ? 36 : 48}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatAxisNumber(Number(v))}
            />
          )}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e7e5e4",
            }}
            labelFormatter={(label) => String(label)}
          />
          {referenceLine && (
            <ReferenceLine
              yAxisId="left"
              y={referenceLine.value}
              stroke="#a8a29e"
              strokeDasharray="4 4"
            />
          )}
          {series.map((s) =>
            s.type === "area" ? (
              <Area
                key={s.key}
                yAxisId={s.yAxisId ?? "left"}
                type="monotone"
                dataKey={s.key}
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
