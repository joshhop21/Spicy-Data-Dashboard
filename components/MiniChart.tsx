"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  ChartHoverState,
  ChartHoverSync,
  ChartSideCallout,
  chartActiveDot,
  hiddenTooltipWrapper,
} from "@/components/ChartHoverStrip";
import { formatChartAxisValue } from "@/lib/format-chart-axis";
import type { ChartDataFile } from "@/lib/types";

type MiniChartProps = {
  data: ChartDataFile;
  compact?: boolean;
};

export function MiniChart({ data, compact = true }: MiniChartProps) {
  const { series, points, referenceLine, axisFormat = "compact" } = data;
  const [hover, setHover] = useState<ChartHoverState>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });
  const plotRef = useRef<HTMLDivElement>(null);
  const hasDualAxis = series.some((s) => s.yAxisId === "right");
  const useArea = series.some((s) => s.type === "area");
  const ChartWrapper = useArea ? AreaChart : LineChart;
  const formatTick = (v: number) => formatChartAxisValue(v, axisFormat);
  const yAxisWidth = compact ? 44 : 52;

  const labelMap = useMemo(
    () => Object.fromEntries(series.map((s) => [s.key, s.label])),
    [series],
  );

  const descriptionMap = useMemo(
    () =>
      Object.fromEntries(
        series.filter((s) => s.description).map((s) => [s.key, s.description!]),
      ),
    [series],
  );

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => {
      setPlotSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`relative w-full overflow-visible ${compact ? "h-36" : "h-80"}`}>
      <div ref={plotRef} className="absolute inset-0">
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
              cursor={false}
              isAnimationActive={false}
              wrapperStyle={hiddenTooltipWrapper}
              content={
                <ChartHoverSync
                  onHover={setHover}
                  labelMap={labelMap}
                  descriptionMap={descriptionMap}
                  formatValue={formatTick}
                />
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
            {series.map((s) =>
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
                  activeDot={{ ...chartActiveDot, fill: s.color }}
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
                  activeDot={{ ...chartActiveDot, fill: s.color }}
                  isAnimationActive={false}
                />
              ),
            )}
          </ChartWrapper>
        </ResponsiveContainer>
      </div>
      {hover && plotSize.w > 0 && (
        <ChartSideCallout
          hover={hover}
          width={plotSize.w}
          height={plotSize.h}
          compact={compact}
        />
      )}
    </div>
  );
}

function formatAxisDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
