"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TickerSearch() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    setError(null);
    router.push(`/company/${encodeURIComponent(symbol)}`);
  }

  return (
    <section className="rounded-xl border border-stone-200/80 bg-card p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-ink">Ticker lookup</h2>
      <p className="mt-1 text-sm text-muted">
        Search a company to open its research page — price, P/E, revenue, and custom metric
        charts with live 30-second refresh.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL, BRK-B, MSFT"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none ring-spice-gold/30 placeholder:text-stone-400 focus:ring-2"
          aria-label="Ticker symbol"
        />
        <button
          type="submit"
          disabled={!ticker.trim()}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open company
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-spice-red" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
