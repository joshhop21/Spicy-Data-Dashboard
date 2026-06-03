"use client";

import { useCallback, useEffect, useState } from "react";
import { InfoTip } from "@/components/InfoTip";
import { BTC_LIQUIDITY_TERMS } from "@/lib/glossary";
import type { QuoteResponse } from "@/lib/types";

const REFRESH_MS = 30_000;

export function BtcLivePriceCard() {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quote?symbol=BTC-USD", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setQuote(json as QuoteResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const positive = (quote?.changePercent ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-4">
      <p className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest text-muted">
        Bitcoin Price
        <InfoTip text={BTC_LIQUIDITY_TERMS["Bitcoin Price"]!} label="About live Bitcoin price" />
      </p>
      {loading && !quote ? (
        <p className="mt-3 font-mono text-2xl font-semibold text-muted">…</p>
      ) : error && !quote ? (
        <p className="mt-3 text-sm text-muted">Live price unavailable</p>
      ) : quote ? (
        <>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink">
            ${quote.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted">BTC-USD · live spot</p>
          <p
            className={`mt-2 text-xs font-medium tabular-nums ${
              positive ? "text-emerald-700" : "text-spice-red"
            }`}
          >
            {positive ? "+" : ""}
            {quote.changePercent.toFixed(2)}% today ({positive ? "+" : ""}$
            {Math.abs(quote.change).toLocaleString(undefined, { maximumFractionDigits: 0 })})
          </p>
        </>
      ) : null}
      <p className="mt-2 text-[10px] text-muted">Updates every 30s</p>
    </div>
  );
}
