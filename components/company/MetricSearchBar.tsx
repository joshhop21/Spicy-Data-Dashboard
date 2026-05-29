"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMPANY_METRICS, DEFAULT_METRIC_IDS } from "@/lib/company-metrics";

type SearchResult = { id: string; label: string; subtitle: string; icon: string };

type Props = {
  symbol: string;
  activeMetricIds: string[];
  onAddMetric: (metricId: string) => void;
};

export function MetricSearchBar({ symbol, activeMetricIds, onAddMetric }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/company/metrics?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setResults(json.results ?? []);
    setHighlight(0);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void search(query), 200);
    return () => window.clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(id: string) {
    if (!activeMetricIds.includes(id)) onAddMetric(id);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[highlight];
      if (item) pick(item.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const available = COMPANY_METRICS.filter((m) => !activeMetricIds.includes(m.id));

  return (
    <section className="rounded-xl border border-stone-200/80 bg-card p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-ink">Add a financial metric</h2>
      <p className="mt-1 text-sm text-muted">
        Search metrics for {symbol} — e.g. type &quot;revenue g&quot; for revenue growth. Each
        selection adds a new chart tile.
      </p>

      <div ref={wrapRef} className="relative mt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder='Try "revenue growth", "eps", "free cash flow"…'
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none ring-spice-gold/30 placeholder:text-stone-400 focus:ring-2"
          aria-label="Search financial metrics"
          aria-expanded={open}
          aria-autocomplete="list"
        />

        {open && results.length > 0 && (
          <ul
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {results.map((r, i) => {
              const already = activeMetricIds.includes(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    disabled={already}
                    onClick={() => pick(r.id)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                      i === highlight ? "bg-stone-50" : ""
                    }`}
                  >
                    <span className="text-lg" aria-hidden>
                      {r.icon}
                    </span>
                    <span>
                      <span className="font-medium text-ink">{r.label}</span>
                      {already && (
                        <span className="ml-2 text-xs text-muted">(already added)</span>
                      )}
                      <span className="mt-0.5 block text-xs text-muted">{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {available.length > 0 && !query && (
        <div className="mt-4 flex flex-wrap gap-2">
          {available.slice(0, 6).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onAddMetric(m.id)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              + {m.label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Default charts: {DEFAULT_METRIC_IDS.map((id) => COMPANY_METRICS.find((m) => m.id === id)?.label).join(", ")}
      </p>
    </section>
  );
}
