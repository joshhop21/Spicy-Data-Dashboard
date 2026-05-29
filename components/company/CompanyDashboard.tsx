"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LiveChartTileById } from "@/components/company/LiveChartTile";
import { MetricSearchBar } from "@/components/company/MetricSearchBar";
import { DEFAULT_METRIC_IDS } from "@/lib/company-metrics";

type Props = { symbol: string };

export function CompanyDashboard({ symbol }: Props) {
  const router = useRouter();
  const [activeMetricIds, setActiveMetricIds] = useState<string[]>(() => [...DEFAULT_METRIC_IDS]);
  const [headerQuery, setHeaderQuery] = useState("");

  const addMetric = useCallback((id: string) => {
    setActiveMetricIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  function handleHeaderSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = headerQuery.trim().toUpperCase();
    if (!next || next === symbol) return;
    router.push(`/company/${encodeURIComponent(next)}`);
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-stone-200 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-3xl" aria-hidden>
              📋
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{symbol}</h1>
            <p className="mt-1 text-sm text-muted">
              Company research · live charts · add metrics below
            </p>
          </div>

          <form onSubmit={handleHeaderSearch} className="flex w-full max-w-md gap-2">
            <input
              type="text"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value.toUpperCase())}
              placeholder="Search another ticker…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none ring-spice-gold/30 focus:ring-2"
              aria-label="Ticker symbol"
            />
            <button
              type="submit"
              disabled={!headerQuery.trim()}
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
            >
              Go
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {activeMetricIds.map((id) => (
          <LiveChartTileById key={`${symbol}-${id}`} symbol={symbol} metricId={id} />
        ))}
      </div>

      <MetricSearchBar symbol={symbol} activeMetricIds={activeMetricIds} onAddMetric={addMetric} />
    </div>
  );
}
