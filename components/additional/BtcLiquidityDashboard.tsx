"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BtcLiquidityModelData } from "@/lib/btc-liquidity-types";

type Props = { data: BtcLiquidityModelData };

export function BtcLiquidityDashboard({ data }: Props) {
  const { headline, cards, points, modelStats, methodology, sources, updatedAt } = data;
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

      {/* Metric cards */}
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

      {/* Main fair value chart */}
      <ChartPanel
        title="Bitcoin vs. Liquidity-Model Fair Value"
        subtitle="Log scale · ±1σ shaded as the likely range, ±2σ as the extreme range"
      >
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={formatAxisDate}
                minTickGap={48}
              />
              <YAxis
                scale="log"
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={(v) => formatLogUsd(Number(v))}
                width={48}
              />
              <Tooltip
                formatter={(v: number) => `$${v.toLocaleString()}`}
                labelFormatter={(l) => String(l)}
              />
              <Area
                type="monotone"
                dataKey="band2High"
                stroke="none"
                fill="#fde68a"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="band2Low"
                stroke="none"
                fill="#faf9f7"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="band1High"
                stroke="none"
                fill="#fcd34d"
                fillOpacity={0.4}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="band1Low"
                stroke="none"
                fill="#faf9f7"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="modelFair"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="btcActual"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          <LegendDot color="#0d9488" label="BTC actual" />
          <LegendDot color="#d97706" label="Model fair value" />
          <LegendDot color="#fcd34d" label="±1σ range" />
          <LegendDot color="#fde68a" label="±2σ range" />
        </div>
      </ChartPanel>

      {/* Z-score */}
      <ChartPanel
        title="Cheap / Dear Indicator"
        subtitle="Z-score of the regression residual · below -1.5 = Strong Cheap, above +1.5 = Strong Dear"
        right={`Current z = ${headline.zScore.toFixed(2)}`}
      >
        <AreaChartSimple
          data={points}
          dataKey="zScore"
          color="#0d9488"
          fill="#99f6e4"
          refLines={[
            { y: 1.5, label: "+1.5" },
            { y: -1.5, label: "-1.5" },
            { y: 0, label: "0" },
          ]}
          yFormatter={(v) => v.toFixed(1)}
        />
      </ChartPanel>

      {/* Bottom trio */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Fed Net Liquidity" subtitle="WALCL - TGA - RRP, $T">
          <AreaChartSimple data={points} dataKey="fedNetLiqT" color="#0d9488" fill="#ccfbf1" yFormatter={(v) => `$${v.toFixed(2)}T`} />
        </ChartPanel>
        <ChartPanel title="Global M2 YoY" subtitle="USD-converted, %">
          <AreaChartSimple
            data={points}
            dataKey="globalM2Yoy"
            color="#d97706"
            fill="#fde68a"
            yFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </ChartPanel>
        <ChartPanel title="Stablecoin Supply" subtitle="USDT + USDC, $B">
          <AreaChartSimple
            data={points}
            dataKey="stableSupplyB"
            color="#c45c4a"
            fill="#fecaca"
            yFormatter={(v) => `$${v.toFixed(0)}B`}
          />
        </ChartPanel>
      </div>

      {/* Methodology */}
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

function ChartPanel({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-serif text-base font-semibold text-ink">{title}</h4>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        {right && <p className="font-mono text-xs tabular-nums text-muted">{right}</p>}
      </div>
      {children}
    </div>
  );
}

function AreaChartSimple({
  data,
  dataKey,
  color,
  fill,
  refLines,
  yFormatter,
}: {
  data: BtcLiquidityModelData["points"];
  dataKey: keyof BtcLiquidityModelData["points"][number];
  color: string;
  fill: string;
  refLines?: { y: number; label: string }[];
  yFormatter?: (v: number) => string;
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#78716c" }} tickFormatter={formatAxisDate} minTickGap={40} />
          <YAxis
            tick={{ fontSize: 9, fill: "#78716c" }}
            width={44}
            tickFormatter={(v) => (yFormatter ? yFormatter(Number(v)) : String(v))}
          />
          <Tooltip />
          {refLines?.map((r) => (
            <ReferenceLine
              key={r.y}
              y={r.y}
              stroke="#a8a29e"
              strokeDasharray="4 4"
              label={{ value: r.label, fontSize: 10, fill: "#78716c" }}
            />
          ))}
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            fill={fill}
            fillOpacity={0.5}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
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

function formatAxisDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatLogUsd(v: number) {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
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
