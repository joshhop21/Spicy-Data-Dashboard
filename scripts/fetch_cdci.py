"""
Credit Default Cycle Index (CDCI):
Equal-weight consumer credit basket vs. gold (GLD proxy / FRED fallback).
Writes data/cdci.json
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "cdci.json"

# 10-name consumer credit / bank exposure basket (update when Jared confirms list)
BASKET = [
    {"ticker": "COF", "category": "Consumer credit", "role": "Issuer"},
    {"ticker": "SYF", "category": "Consumer credit", "role": "Issuer"},
    {"ticker": "AXP", "category": "Consumer credit", "role": "Issuer"},
    {"ticker": "ALLY", "category": "Consumer credit", "role": "Issuer"},
    {"ticker": "BAC", "category": "Bank", "role": "Exposure"},
    {"ticker": "JPM", "category": "Bank", "role": "Exposure"},
    {"ticker": "C", "category": "Bank", "role": "Exposure"},
    {"ticker": "WFC", "category": "Bank", "role": "Exposure"},
    {"ticker": "USB", "category": "Bank", "role": "Exposure"},
    {"ticker": "PNC", "category": "Bank", "role": "Exposure"},
]

GOLD_TICKERS = ["GLD", "GC=F"]
FRED_GOLD_SERIES = "GOLDPMGBD228NLBM"


def _extract_close(hist: pd.DataFrame, symbol: str) -> pd.Series:
    if hist.empty:
        raise RuntimeError(f"No data for {symbol}")
    if isinstance(hist.columns, pd.MultiIndex):
        level0 = hist.columns.get_level_values(0)
        level1 = hist.columns.get_level_values(1)
        if symbol in level1 and "Close" in level0:
            close = hist["Close"][symbol]
        elif symbol in level0:
            close = hist[symbol]["Close"]
        elif "Close" in level0:
            close = hist["Close"]
        else:
            raise RuntimeError(f"No Close column for {symbol}")
    else:
        close = hist["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close = close.dropna()
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close.sort_index()


def download_all_closes(symbols: list[str], retries: int = 3) -> pd.DataFrame:
    """Batch download — one Yahoo request for all symbols."""
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            tickers_str = " ".join(symbols)
            hist = yf.download(
                tickers_str,
                period="2y",
                interval="1d",
                progress=False,
                auto_adjust=True,
                group_by="column",
            )
            if hist.empty:
                raise RuntimeError("empty download")

            if len(symbols) == 1:
                return pd.DataFrame({symbols[0]: _extract_close(hist, symbols[0])})

            closes: dict[str, pd.Series] = {}
            for sym in symbols:
                try:
                    closes[sym] = _extract_close(hist, sym)
                except Exception:  # noqa: BLE001
                    if "Close" in hist.columns and len(symbols) == 1:
                        closes[sym] = _extract_close(hist, sym)
                    else:
                        raise
            return pd.DataFrame(closes)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Batch download failed: {last_err}")


def fetch_gold_fred() -> pd.Series:
    api_key = os.environ.get("FRED_API_KEY")
    if not api_key:
        raise RuntimeError("FRED_API_KEY not set")
    url = (
        "https://api.stlouisfed.org/fred/series/observations"
        f"?series_id={FRED_GOLD_SERIES}&api_key={api_key}&file_type=json"
    )
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    rows = []
    for obs in resp.json().get("observations", []):
        if obs.get("value") in (".", None, ""):
            continue
        rows.append((pd.Timestamp(obs["date"]), float(obs["value"])))
    if not rows:
        raise RuntimeError("Empty FRED gold series")
    return pd.Series(dict(rows)).sort_index()


def fetch_gold_from_frame(frame: pd.DataFrame) -> pd.Series | None:
    for ticker in GOLD_TICKERS:
        if ticker in frame.columns:
            print(f"Gold from Yahoo ({ticker})")
            return frame[ticker].dropna()
    return None


def fetch_gold(frame: pd.DataFrame | None = None) -> pd.Series:
    if frame is not None:
        series = fetch_gold_from_frame(frame)
        if series is not None and not series.empty:
            return series
    try:
        gold_df = download_all_closes(GOLD_TICKERS[:1])
        series = fetch_gold_from_frame(gold_df)
        if series is not None and not series.empty:
            return series
    except Exception as exc:  # noqa: BLE001
        print(f"Yahoo gold failed ({exc}), trying FRED...")
    series = fetch_gold_fred()
    print("Gold from FRED")
    return series


def build_equal_weight_index_from_frame(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or len(df.columns) < 3:
        raise RuntimeError("Insufficient basket price history")
    normalized = df / df.iloc[0] * 100.0
    out = pd.DataFrame(index=df.index)
    out["cdci"] = normalized.mean(axis=1)
    return out


def build_constituents() -> list[dict]:
    weight = f"{100 // len(BASKET)}%"
    return [
        {
            "ticker": item["ticker"],
            "weight": weight,
            "category": item["category"],
            "status": "Active",
            "role": item["role"],
        }
        for item in BASKET
    ]


def build_payload(df: pd.DataFrame, gold: pd.Series) -> dict:
    combined = pd.DataFrame({"cdci": df["cdci"]})
    combined["gold"] = gold.reindex(combined.index, method="ffill")
    combined = combined.dropna().tail(400)

    points = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "cdci": round(float(row["cdci"]), 2),
            "gold": round(float(row["gold"]), 2),
        }
        for idx, row in combined.iterrows()
    ]

    latest = combined.iloc[-1]
    prev = combined.iloc[-2] if len(combined) > 1 else latest
    delta_pct = float(((latest["cdci"] - prev["cdci"]) / prev["cdci"]) * 100)

    return {
        "slug": "cdci",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{float(latest['cdci']):.1f}",
            "delta": f"{delta_pct:+.1f}%",
            "deltaDate": combined.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta_pct >= 0),
        },
        "series": [
            {
                "key": "cdci",
                "label": "CDCI",
                "color": "#c45c4a",
                "type": "line",
                "yAxisId": "left",
            },
            {
                "key": "gold",
                "label": "Gold",
                "color": "#b8860b",
                "type": "line",
                "yAxisId": "right",
            },
        ],
        "points": points,
        "thesis": (
            "The Credit Default Cycle Index tracks an equal-weight basket of consumer credit "
            "and bank exposures against gold. When credit stress rises while gold strengthens, "
            "the cycle often signals late-cycle risk appetite shifts."
        ),
        "methodology": (
            "CDCI is the equal-weight average of 10 normalized equity series (rebased to 100 at "
            "the start of the window). Gold is GLD (or FRED London PM gold if ETF data fails). "
            "Daily closes from Yahoo Finance."
        ),
        "sources": [
            f"Yahoo Finance ({', '.join(c['ticker'] for c in BASKET)}, GLD)",
            f"FRED {FRED_GOLD_SERIES} (gold fallback)",
        ],
        "constituents": build_constituents(),
    }


def main() -> None:
    tickers = [c["ticker"] for c in BASKET]
    gold_symbol = GOLD_TICKERS[0]
    print("Building CDCI basket + gold (single batch)...")
    all_symbols = tickers + [gold_symbol]
    raw = download_all_closes(all_symbols)
    basket_df = build_equal_weight_index_from_frame(raw[tickers])
    gold = fetch_gold(raw)
    payload = build_payload(basket_df, gold)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points)")


if __name__ == "__main__":
    main()
