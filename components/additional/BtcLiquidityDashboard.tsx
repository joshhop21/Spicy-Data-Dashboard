"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { BtcLivePriceCard } from "@/components/additional/BtcLivePriceCard";
import {
  ChartHoverState,
  ChartHoverSync,
  ChartSideCallout,
  chartActiveDot,
  hiddenTooltipWrapper,
} from "@/components/ChartHoverStrip";
import { InfoTip } from "@/components/InfoTip";
import { BTC_LIQUIDITY_TERMS } from "@/lib/glossary";
import type { BtcLiquidityModelData, BtcLiquidityPoint } from "@/lib/btc-liquidity-types";

type Props = { data: BtcLiquidityModelData };

type RangeKey = "1Y" | "3Y" | "5Y" | "ALL";

/** Matches Global M2 YoY chart — soft area fill, coral stroke. */
const CHART_STYLE = {
  lineType: "monotone" as const,
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
  const { headline, cards, points, updatedAt } = data;
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
          <h2 className="font-serif text-2xl font-semibold text-ink">Bitcoin Liquidity Model</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Compares Bitcoin to a fair-value estimate built from Fed net liquidity, global M2
            growth, and stablecoin supply. Hover any{" "}
            <span className="font-medium text-stone-600">?</span> for definitions.
          </p>
        </div>
        <p className="text-xs text-muted">
          Model data updated{" "}
          <time dateTime={updatedAt}>{formatDisplayDate(updatedAt)}</time>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <BtcLivePriceCard />

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4">
          <p className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest text-muted">
            Model Signal
            <InfoTip text={BTC_LIQUIDITY_TERMS["Model Signal"]!} label="About model signal" />
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            {headline.signal}
          </p>
          <p className="mt-1 text-xs text-muted">
            Fair value ${headline.fairValue.toLocaleString()} · range $
            {headline.rangeLow.toLocaleString()} – ${headline.rangeHigh.toLocaleString()}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-emerald-200/60 pt-3 text-center text-[10px]">
            <div>
              <p className="inline-flex items-center justify-center uppercase text-muted">
                Vs fair
                <InfoTip text={BTC_LIQUIDITY_TERMS["Vs Fair"]!} />
              </p>
              <p className={`mt-0.5 font-semibold tabular-nums ${signalColor}`}>
                {headline.vsFairPct >= 0 ? "+" : ""}
                {headline.vsFairPct.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="inline-flex items-center justify-center uppercase text-muted">
                Z-score
                <InfoTip text={BTC_LIQUIDITY_TERMS["Z-Score"]!} />
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">{headline.zScore.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <MetricCard
          termKey="Fed Net Liquidity"
          label="Fed Net Liquidity"
          value={`$${cards.fedNetLiqT.toFixed(1)}T`}
          sub="Assets − TGA − RRP"
        />
        <MetricCard
          termKey="Global M2 (USD) YoY"
          label="Global M2 YoY"
          value={`${cards.globalM2Yoy >= 0 ? "+" : ""}${cards.globalM2Yoy.toFixed(2)}%`}
          sub="US + EA + JP + CN + UK"
        />
        <MetricCard
          termKey="Stablecoin Supply"
          label="Stablecoin Supply"
          value={`$${cards.stableSupplyB.toFixed(1)}B`}
          sub={`USDT + USDC · 30d ${cards.stable30dPct >= 0 ? "+" : ""}${cards.stable30dPct.toFixed(2)}%`}
        />
      </div>

      <ChartPanel
        title="Bitcoin vs. Liquidity-Model Fair Value"
        infoKey="Model fair value"
        subtitle="Log scale · shaded bands show typical and extreme deviations from the model"
        range={range}
        onRangeChange={setRange}
      >
        <FairValueChart data={fairValuePoints} />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <LegendItem color={CHART_STYLE.color} label="BTC price" infoKey="BTC actual" />
          <LegendItem color={CHART_STYLE.modelColor} label="Model fair value" infoKey="Model fair value" />
          <LegendItem color={CHART_STYLE.bandInner} label="Likely range" infoKey="Likely range" />
          <LegendItem color={CHART_STYLE.bandOuter} label="Extreme range" infoKey="Extreme range" />
        </div>
      </ChartPanel>

      <ChartPanel
        title="Cheap / Dear Indicator"
        infoKey="Cheap / Dear Indicator"
        subtitle="How far price sits from the model vs history · dashed lines at cheap/dear thresholds"
        right={`Current z = ${headline.zScore.toFixed(2)}`}
        range={range}
        onRangeChange={setRange}
      >
        <LiquidityAreaChart
          data={filtered}
          series={[{ key: "zScore", label: "Z-score" }]}
          yFormatter={(v) => v.toFixed(1)}
          referenceLines={[
            { y: 1.5, label: "Dear (+1.5)" },
            { y: -1.5, label: "Cheap (−1.5)" },
            { y: 0, label: "Fair" },
          ]}
        />
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel
          title="Fed Net Liquidity"
          infoKey="Fed Net Liquidity"
          subtitle="WALCL − TGA − RRP, trillions USD"
          range={range}
          onRangeChange={setRange}
        >
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "fedNetLiqT", label: "Fed net liquidity" }]}
            yFormatter={(v) => `$${v.toFixed(2)}T`}
          />
        </ChartPanel>
        <ChartPanel
          title="Global M2 YoY"
          infoKey="Global M2 (USD) YoY"
          subtitle="USD-converted broad money, five major economies"
          range={range}
          onRangeChange={setRange}
        >
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "globalM2Yoy", label: "Global M2 YoY" }]}
            yFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </ChartPanel>
        <ChartPanel
          title="Stablecoin Supply"
          infoKey="Stablecoin Supply"
          subtitle="USDT + USDC outstanding, billions USD"
          range={range}
          onRangeChange={setRange}
        >
          <LiquidityAreaChart
            data={filtered}
            series={[{ key: "stableSupplyB", label: "Stablecoin supply" }]}
            yFormatter={(v) => `$${v.toFixed(0)}B`}
          />
        </ChartPanel>
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
}: {
  data: BtcLiquidityPoint[] | FairValuePoint[];
  series: SeriesConfig[];
  heightClass?: string;
  logScale?: boolean;
  yFormatter?: (v: number) => string;
  referenceLines?: { y: number; label?: string }[];
}) {
  const [hover, setHover] = useState<ChartHoverState>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });
  const plotRef = useRef<HTMLDivElement>(null);
  const labelMap = useMemo(
    () => Object.fromEntries(series.map((s) => [String(s.key), s.label ?? String(s.key)])),
    [series],
  );

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setPlotSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chartData = data.filter((p) => {
    const v = p[series[0].key as keyof typeof p];
    return typeof v === "number" && Number.isFinite(v);
  });

  if (chartData.length === 0) {
    return <ChartEmpty heightClass={heightClass} />;
  }

  const tickFormatter = (v: number) => {
    if (!Number.isFinite(v)) return "";
    return yFormatter ? yFormatter(v) : String(v);
  };

  return (
    <div className={`relative w-full overflow-visible ${heightClass}`}>
      <div ref={plotRef} className="absolute inset-0">
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
            tick={{ fontSize: 10, fill: CHART_STYLE.tickFill }}
            width={48}
            axisLine={false}
            tickLine={false}
            tickFormatter={tickFormatter}
            {...(logScale
              ? { scale: "log" as const, domain: ["auto", "auto"] as [string, string], allowDataOverflow: true }
              : {})}
          />
          <Tooltip
            cursor={false}
            wrapperStyle={hiddenTooltipWrapper}
            content={
              <ChartHoverSync
                onHover={setHover}
                labelMap={labelMap}
                formatValue={tickFormatter}
              />
            }
          />
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
              dataKey={String(s.key)}
              name={s.label ?? String(s.key)}
              stroke={s.color ?? CHART_STYLE.color}
              fill={s.color ?? CHART_STYLE.color}
              fillOpacity={CHART_STYLE.fillOpacity}
              strokeWidth={CHART_STYLE.strokeWidth}
              dot={false}
              activeDot={{ ...chartActiveDot, fill: s.color ?? CHART_STYLE.color }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
        </ResponsiveContainer>
      </div>
      {hover && plotSize.w > 0 && (
        <ChartSideCallout hover={hover} width={plotSize.w} height={plotSize.h} compact />
      )}
    </div>
  );
}

function FairValueChart({ data }: { data: FairValuePoint[] }) {
  const [hover, setHover] = useState<ChartHoverState>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 });
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setPlotSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) {
    return <ChartEmpty heightClass="h-80" />;
  }

  return (
    <div className="relative h-80 w-full overflow-visible">
      <div ref={plotRef} className="absolute inset-0">
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
          <Tooltip
            cursor={false}
            wrapperStyle={hiddenTooltipWrapper}
            content={<FairValueHoverSync onHover={setHover} />}
          />
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
            activeDot={{ ...chartActiveDot, fill: CHART_STYLE.modelColor }}
            connectNulls
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
            activeDot={{ ...chartActiveDot, fill: CHART_STYLE.color }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hover && plotSize.w > 0 && (
        <ChartSideCallout hover={hover} width={plotSize.w} height={plotSize.h} compact={false} />
      )}
    </div>
  );
}

function FairValueHoverSync({
  active,
  payload,
  label,
  coordinate,
  onHover,
}: TooltipProps<number, string> & { onHover: (state: ChartHoverState) => void }) {
  useEffect(() => {
    if (!active || !payload?.length || !coordinate || coordinate.x == null || coordinate.y == null) {
      onHover(null);
      return;
    }
    const row = payload[0]?.payload as BtcLiquidityPoint | undefined;
    if (!row) {
      onHover(null);
      return;
    }
    onHover({
      date: String(label),
      anchor: { x: coordinate.x, y: coordinate.y },
      rows: [
        {
          label: "BTC price",
          value: `$${row.btcActual.toLocaleString()}`,
          color: CHART_STYLE.color,
        },
        {
          label: "Model fair",
          value: `$${row.modelFair.toLocaleString()}`,
          color: CHART_STYLE.modelColor,
        },
        {
          label: "Likely range",
          value: `$${row.band1Low.toLocaleString()} – $${row.band1High.toLocaleString()}`,
        },
      ],
    });
  }, [active, payload, label, coordinate, onHover]);

  return null;
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
  infoKey,
  right,
  range,
  onRangeChange,
  children,
}: {
  title: string;
  subtitle: string;
  infoKey?: string;
  right?: string;
  range?: RangeKey;
  onRangeChange?: (r: RangeKey) => void;
  children: React.ReactNode;
}) {
  const tip = infoKey ? BTC_LIQUIDITY_TERMS[infoKey] : undefined;
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="inline-flex items-center font-serif text-base font-semibold text-ink">
            {title}
            {tip && <InfoTip text={tip} label={`About ${title}`} />}
          </h4>
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
  termKey,
  label,
  value,
  sub,
}: {
  termKey: string;
  label: string;
  value: string;
  sub: string;
}) {
  const tip = BTC_LIQUIDITY_TERMS[termKey];
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4">
      <p className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
        {tip && <InfoTip text={tip} label={`About ${label}`} />}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}

function LegendItem({
  color,
  label,
  infoKey,
}: {
  color: string;
  label: string;
  infoKey: string;
}) {
  const tip = BTC_LIQUIDITY_TERMS[infoKey];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-4 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
      <span>{label}</span>
      {tip && <InfoTip text={tip} label={`About ${label}`} />}
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

function formatChartDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
