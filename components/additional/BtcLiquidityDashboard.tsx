"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { BtcLiquidityModelData, BtcLiquidityPoint } from "@/lib/btc-liquidity-types";

type Props = { data: BtcLiquidityModelData };

type RangeKey = "1Y" | "3Y" | "5Y" | "ALL";

/** Matches Global M2 YoY chart — linear segments, soft area fill, coral stroke. */
const CHART_STYLE = {
  lineType: "linear" as const,
  color: "#c45c4a",
  fillOpacity: 0.2,
  strokeWidth: 2,
  gridStroke: "#e7e5e4",
  tickFill: "#78716c",
  bandOuter: "#d6d3d1",
  bandInner: "#e7e5e4",
  modelColor: "#b45309",
  stone: "#a8a29e",
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1Y", label: "1Y" },
  { key: "3Y", label: "3Y" },
  { key: "5Y", label: "5Y" },
  { key: "ALL", label: "ALL" },
];

type FairValuePoint = BtcLiquidityPoint & {
  band1Range: [number, number];
  band2Range: [number, number];
};

type SeriesConfig = {
  key: keyof BtcLiquidityPoint | string;
  color?: string;
  label?: string;
};

export function BtcLiquidityDashboard({ data }: Props) {
  const { headline, cards, points, modelStats, methodology, sources, updatedAt } = data;
  const [range, setRange] = useState<RangeKey>("ALL");

  const filtered = useMemo(() => filterByRange(points, range), [points, range]);

  const fairValuePoints = useMemo<FairValuePoint[]>(
    () =>
      filtered
        .filter(
          (p) =>
            p.btcActual > 0 &&
            p.modelFair > 0 &&
            p.band1Low > 0 &&
            p.band1High > 0 &&
            p.band2Low > 0 &&
            p.band2High > 0,
        )
        .map((p) => ({
          ...p,
          band1Range: [p.band1Low, p.band1High],
          band2Range: [p.band2Low, p.band2High],
        })),
    [filtered],
  );

  const signalColor =
    headline.zScore <= -1.5 ? "text-emerald-700" : headline.zScore >= 1.5 ? "text-red-600" : "text-ink";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-ink">Bitcoin Liquidity Model</h3>
          <p className="mt-1 text-sm text-muted">
            Fair-value bands from Fed Net Liquidity, Global M2, and stablecoin supply · weekly · 2015
            to present
          </p>
        </div>
        <p className="text-xs text-muted">
          Updated{" "}
          <time dateTime={updatedAt}>{formatDisplayDate(updatedAt)}</time>
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 lg:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Current Reading</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            ${headline.btcActual.toLocaleString()}{" "}
            <span className="text-base font-normal text-muted">BTC actual</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Fair value ${headline.fairValue.toLocaleString()} · likely range $
            {headline.rangeLow.toLocaleString()} – ${headline.rangeHigh.toLocaleString()}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-emerald-200/60 pt-3 text-center text-[10px]">
            <div>
              <p className="uppercase text-muted">Signal</p>
              <p className={`mt-0.5 font-semibold ${signalColor}`}>{headline.signal}</p>
            </div>
            <div>
              <p className="uppercase text-muted">Vs Fair</p>
              <p className={`mt-0.5 font-semibold tabular-nums ${signalColor}`}>
                {headline.vsFairPct >= 0 ? "+" : ""}
                {headline.vsFairPct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="uppercase text-muted">Z-Score</p>
              <p className="mt-0.5 font-semibold tabular-nums">{headline.zScore.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <MetricCard
          label="Fed Net Liquidity"
          value={`$${cards.fedNetLiqT.toFixed(1)}T`}
          sub="Assets – TGA – RRP"
          hint="See trend below"
        />
        <MetricCard
          label="Global M2 (USD) YoY"
          value={`${cards.globalM2Yoy >= 0 ? "+" : ""}${cards.globalM2Yoy.toFixed(2)}%`}
          sub="US + EA + JP + CN + UK"
          hint={cards.globalM2Yoy > 0 ? "Expansionary" : "Contracting"}
        />
        <MetricCard
          label="Stablecoin Supply"
          value={`$${cards.stableSupplyB.toFixed(1)}B`}
          sub="USDT + USDC"
          hint={`30-day: ${cards.stable30dPct >= 0 ? "+" : ""}${cards.stable30dPct.toFixed(2)}%`}
        />
      </div>

      <ChartPanel
        title="Bitcoin vs. Liquidity-Model Fair Value"
        subtitle="Log scale · ±1σ shaded as the likely range, ±2σ as the extreme range"
        range={range}
        onRangeChange={setRange}
      >
        <FairValueChart data={fairValuePoints} />
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          <LegendDot color={CHART_STYLE.color} label="BTC actual" />
          <LegendDot color={CHART_STYLE.modelColor} label="Model fair value" />
          <LegendDot color={CHART_STYLE.bandInner} label="±1σ range" />
          <LegendDot color={CHART_STYLE.bandOuter} label="±2σ range" />
        </div>
      </ChartPanel>

      <ChartPanel
        title="Cheap / Dear Indicator"
        subtitle="Z-score of the regression residual · below -1.5 = Strong Cheap, above +1.5 = Strong Dear"
        right={`Current z = ${headline.zScore.toFixed(2)}`}
        range={range}
        onRangeChange={setRange}
      >
        <LiquidityAreaChart
          data={filtered}
          series={[{ key: "zScore", label: "Z-score" }]}
          yFormatter={(v) => v.toFixed(1)}
          referenceLines={[
            { y: 1.5, label: "+1.5" },
            { y: -1.5, label: "-1.5" },
            { y: 0 },
          ]}
        />
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Fed Net Liquidity" subtitle="WALCL - TGA - RRP, $T" range={range} onRangeChange={setRange}>
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "fedNetLiqT", label: "Fed net liq" }]}
            yFormatter={(v) => `$${v.toFixed(2)}T`}
          />
        </ChartPanel>
        <ChartPanel title="Global M2 YoY" subtitle="USD-converted, US + EA + JP + CN + UK" range={range} onRangeChange={setRange}>
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "globalM2Yoy", label: "Global M2 YoY" }]}
            yFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </ChartPanel>
        <ChartPanel title="Stablecoin Supply" subtitle="USDT + USDC, $B" range={range} onRangeChange={setRange}>
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "stableSupplyB", label: "Stablecoin supply" }]}
            yFormatter={(v) => `$${v.toFixed(0)}B`}
          />
        </ChartPanel>
      </div>

      <div className="rounded-xl border border-stone-200/80 bg-card p-5 text-sm leading-relaxed text-stone-700">
        <h4 className="font-serif text-lg font-semibold text-ink">Methodology</h4>
        <p className="mt-2">{methodology}</p>
        <p className="mt-3 text-xs text-muted">
          R² = {modelStats.r2} · {modelStats.observations} observations · residual σ (log) ={" "}
          {modelStats.residualSigma}
        </p>
        <ul className="mt-3 list-inside list-disc text-xs text-muted">
          {sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Shared chart shell — same grid, axes, tooltip as Global M2 YoY. */
function LiquidityAreaChart({
  data,
  series,
  heightClass = "h-48",
  logScale = false,
  yFormatter,
  referenceLines,
  tooltipContent,
}: {
  data: BtcLiquidityPoint[] | FairValuePoint[];
  series: SeriesConfig[];
  heightClass?: string;
  logScale?: boolean;
  yFormatter?: (v: number) => string;
  referenceLines?: { y: number; label?: string }[];
  tooltipContent?: React.ReactNode;
}) {
  const chartData = data.filter((p) =>
    series.every((s) => {
      const v = p[s.key as keyof typeof p];
      return typeof v === "number" && Number.isFinite(v);
    }),
  );

  if (chartData.length === 0) {
    return <ChartEmpty heightClass={heightClass} />;
  }

  const tickFormatter = (v: number) => (yFormatter ? yFormatter(v) : String(v));

  return (
    <div className={`${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_STYLE.gridStroke} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: CHART_STYLE.tickFill }}
            tickFormatter={formatAxisDate}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? "log" : undefined}
            domain={logScale ? ["auto", "auto"] : undefined}
            allowDataOverflow={logScale}
            tick={{ fontSize: 10, fill: CHART_STYLE.tickFill }}
            width={48}
            axisLine={false}
            tickLine={false}
            tickFormatter={tickFormatter}
          />
          {tooltipContent ?? (
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e7e5e4",
              }}
              labelFormatter={(l) => String(l)}
              formatter={(value: number, name: string) => [
                tickFormatter(value),
                series.find((s) => s.key === name)?.label ?? name,
              ]}
            />
          )}
          {referenceLines?.map((r) => (
            <ReferenceLine
              key={r.y}
              y={r.y}
              stroke={CHART_STYLE.stone}
              strokeDasharray="4 4"
              label={
                r.label
                  ? { value: r.label, fontSize: 10, fill: CHART_STYLE.tickFill, position: "right" }
                  : undefined
              }
            />
          ))}
          {series.map((s) => (
            <Area
              key={String(s.key)}
              type={CHART_STYLE.lineType}
              dataKey={s.key as string}
              name={String(s.key)}
              stroke={s.color ?? CHART_STYLE.color}
              fill={s.color ?? CHART_STYLE.color}
              fillOpacity={CHART_STYLE.fillOpacity}
              strokeWidth={CHART_STYLE.strokeWidth}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FairValueChart({ data }: { data: FairValuePoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty heightClass="h-80" />;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_STYLE.gridStroke} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: CHART_STYLE.tickFill }}
            tickFormatter={formatAxisDate}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            allowDataOverflow
            tick={{ fontSize: 10, fill: CHART_STYLE.tickFill }}
            tickFormatter={formatLogUsd}
            width={48}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<FairValueTooltip />} />
          <Area
            type={CHART_STYLE.lineType}
            dataKey="band2Range"
            isRange
            stroke="none"
            fill={CHART_STYLE.bandOuter}
            fillOpacity={0.4}
            isAnimationActive={false}
            legendType="none"
          />
          <Area
            type={CHART_STYLE.lineType}
            dataKey="band1Range"
            isRange
            stroke="none"
            fill={CHART_STYLE.bandInner}
            fillOpacity={0.55}
            isAnimationActive={false}
            legendType="none"
          />
          <Area
            type={CHART_STYLE.lineType}
            dataKey="modelFair"
            name="modelFair"
            stroke={CHART_STYLE.modelColor}
            fill={CHART_STYLE.modelColor}
            fillOpacity={CHART_STYLE.fillOpacity}
            strokeWidth={CHART_STYLE.strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type={CHART_STYLE.lineType}
            dataKey="btcActual"
            name="btcActual"
            stroke={CHART_STYLE.color}
            fill={CHART_STYLE.color}
            fillOpacity={CHART_STYLE.fillOpacity}
            strokeWidth={CHART_STYLE.strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FairValueTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as BtcLiquidityPoint | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-stone-800">{String(label)}</p>
      <p className="text-stone-600">
        BTC actual: <span className="font-mono tabular-nums">${row.btcActual.toLocaleString()}</span>
      </p>
      <p className="text-stone-600">
        Model fair value:{" "}
        <span className="font-mono tabular-nums">${row.modelFair.toLocaleString()}</span>
      </p>
      <p className="text-stone-500">
        ±1σ: ${row.band1Low.toLocaleString()} – ${row.band1High.toLocaleString()}
      </p>
      <p className="text-stone-500">
        ±2σ: ${row.band2Low.toLocaleString()} – ${row.band2High.toLocaleString()}
      </p>
    </div>
  );
}

function RangeSelector({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div className="flex gap-1">
      {RANGE_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            range === key
              ? "bg-stone-800 text-white"
              : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  right,
  range,
  onRangeChange,
  children,
}: {
  title: string;
  subtitle: string;
  right?: string;
  range?: RangeKey;
  onRangeChange?: (r: RangeKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-base font-semibold text-ink">{title}</h4>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {right && <p className="font-mono text-xs tabular-nums text-muted">{right}</p>}
          {range && onRangeChange && <RangeSelector range={range} onChange={onRangeChange} />}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ heightClass = "h-48" }: { heightClass?: string }) {
  return (
    <div className={`flex ${heightClass} items-center justify-center text-xs text-muted`}>
      No data for this range
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  hint,
}: {
  label: string;
  value: string;
  sub: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function filterByRange(points: BtcLiquidityPoint[], range: RangeKey): BtcLiquidityPoint[] {
  if (range === "ALL" || points.length === 0) return points;
  const years = range === "1Y" ? 1 : range === "3Y" ? 3 : 5;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return points.filter((p) => new Date(p.date) >= cutoff);
}

function formatAxisDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatLogUsd(v: number) {
  if (!Number.isFinite(v) || v <= 0) return "";
  if (v >= 100_000) return `$${Math.round(v / 1000)}k`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

function formatDisplayDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}
