"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuoteResponse } from "@/lib/types";

/** How often to refetch price while a ticker is displayed (ms) */
const LIVE_REFRESH_MS = 30_000;

export function TickerSearch() {
  const [ticker, setTicker] = useState("");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(true);

  const fetchQuote = useCallback(async (symbol: string, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
      setQuote(null);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not fetch quote");
      }
      setQuote(data as QuoteResponse);
      setError(null);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setQuote(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    setActiveSymbol(symbol);
    await fetchQuote(symbol, false);
  }

  useEffect(() => {
    if (!activeSymbol || !liveEnabled) return;

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchQuote(activeSymbol, true);
      }
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(id);
  }, [activeSymbol, liveEnabled, fetchQuote]);

  return (
    <section className="rounded-xl border border-stone-200/80 bg-card p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-ink">Ticker lookup</h2>
      <p className="mt-1 text-sm text-muted">
        Live price from Yahoo Finance — refreshes every 30 seconds while you watch a
        ticker.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL, BRK-B, GLD"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none ring-spice-gold/30 placeholder:text-stone-400 focus:ring-2"
          aria-label="Ticker symbol"
        />
        <button
          type="submit"
          disabled={loading || !ticker.trim()}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading…" : "Get price"}
        </button>
      </form>

      {quote && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={liveEnabled}
            onChange={(e) => setLiveEnabled(e.target.checked)}
            className="rounded border-stone-300"
          />
          Auto-refresh every 30 seconds
        </label>
      )}

      {error && (
        <p className="mt-3 text-sm text-spice-red" role="alert">
          {error}
        </p>
      )}

      {quote && (
        <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-xl font-semibold">{quote.symbol}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatPrice(quote.price, quote.currency)}
            </p>
          </div>
          <p
            className={`mt-1 text-sm font-medium tabular-nums ${
              quote.change >= 0 ? "text-emerald-700" : "text-spice-red"
            }`}
          >
            {quote.change >= 0 ? "+" : ""}
            {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(2)}%)
          </p>
          <p className="mt-2 text-xs text-muted">
            As of {formatAsOf(quote.asOf)}
            {liveEnabled && (
              <span className="ml-2">
                {refreshing ? "· Updating…" : "· Live"}
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatAsOf(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
