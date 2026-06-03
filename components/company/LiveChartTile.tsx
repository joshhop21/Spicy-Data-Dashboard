"use client";

import { useCallback, useEffect, useState } from "react";
import { MiniChart } from "@/components/MiniChart";
import { CHART_RANGES, type ChartRange, type MetricDefinition } from "@/lib/company-metrics";
import type { ChartDataFile } from "@/lib/types";

const REFRESH_MS = 30_000;

type Props = {
  symbol: string;
  metric: MetricDefinition;
};

export function LiveChartTile({ symbol, metric }: Props) {
  const [range, setRange] = useState<ChartRange>(() =>
    metric.id === "revenue-growth" ? "3Y" : "1Y",
  );
  const [data, setData] = useState<ChartDataFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await fetch(
          `/api/company/chart?symbol=${encodeURIComponent(symbol)}&metric=${encodeURIComponent(metric.id)}&range=${range}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok && !json.unavailable) {
          throw new Error(json.error ?? "Failed to load chart");
        }
        setData(json as ChartDataFile);
        setError(null);
      } catch (err) {
        if (!background) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setData(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [symbol, metric.id, range],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const headline = data?.headline;

  return (
    <article className="relative flex flex-col overflow-visible rounded-xl border border-stone-200/80 bg-card shadow-sm hover:z-40">
      <div className="border-b border-stone-100 px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${metric.accentColor}18` }}
              aria-hidden
            >
              {metric.icon}
            </span>
            <div>
              <h3 className="font-serif text-sm font-semibold leading-snug text-ink sm:text-base">
                {metric.label}
              </h3>
              <p className="text-xs text-muted">{metric.subtitle}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {CHART_RANGES.map(({ key }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                  range === key
                    ? "bg-stone-800 text-white"
                    : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-xs text-muted">
            {refreshing ? "Updating…" : "Live · 30s refresh"}
          </p>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-ink sm:text-2xl">
              {loading ? "…" : (headline?.value ?? "—")}
            </p>
            {headline && !loading && headline.delta && (
              <p
                className={`text-xs font-medium tabular-nums ${
                  headline.deltaPositive === false ? "text-spice-red" : "text-emerald-700"
                }`}
              >
                {headline.delta}
                {headline.deltaDate ? ` ${headline.deltaDate}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-visible px-2 pb-3 pt-1">
        {error && (
          <div className="flex h-36 flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-medium text-muted">Could not load</p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        )}
        {!error && loading && (
          <div className="flex h-36 items-center justify-center text-xs text-muted">Loading…</div>
        )}
        {!error && !loading && data?.unavailable && (
          <div className="flex h-36 flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-medium text-muted">N/A</p>
            <p className="text-xs text-muted">{data.unavailable}</p>
          </div>
        )}
        {!error && !loading && !data?.unavailable && data?.points?.length ? (
          <>
            <MiniChart data={data} />
            {data.dataNote && (
              <p className="px-3 pb-1 text-center text-[10px] leading-snug text-muted">
                {data.dataNote}
              </p>
            )}
          </>
        ) : null}
        {!error && !loading && !data?.unavailable && !data?.points?.length && (
          <div className="flex h-36 items-center justify-center text-xs text-muted">No data</div>
        )}
      </div>
    </article>
  );
}

