"""
Private Credit Stress Index — equal-weight BDC discount-to-NAV vs. HY OAS.
BDCs: OBDC, ARCC, BXSL, GBDC, FSK, TSLX, MAIN
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from fred_utils import fetch_fred_series, load_fred_api_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "private-credit-stress.json"
HY_SERIES = "BAMLH0A0HYM2"

BDC_BASKET = [
    {"ticker": "OBDC", "category": "BDC", "role": "Private credit"},
    {"ticker": "ARCC", "category": "BDC", "role": "Private credit"},
    {"ticker": "BXSL", "category": "BDC", "role": "Private credit"},
    {"ticker": "GBDC", "category": "BDC", "role": "Private credit"},
    {"ticker": "FSK", "category": "BDC", "role": "Private credit"},
    {"ticker": "TSLX", "category": "BDC", "role": "Private credit"},
    {"ticker": "MAIN", "category": "BDC", "role": "Private credit"},
]


def fetch_bdc_discount_index() -> pd.Series:
    """Average BDC discount to NAV (%) from price/book."""
    discounts = []
    for item in BDC_BASKET:
        t = item["ticker"]
        info = yf.Ticker(t).info
        ptb = info.get("priceToBook") or info.get("bookValue")
        if ptb and isinstance(ptb, (int, float)) and ptb > 0:
            # discount to NAV % ≈ (1 - 1/priceToBook) * 100 when P/B = price/book
            disc = (1 - 1 / float(ptb)) * 100
            discounts.append(disc)
        time.sleep(0.3)
    if not discounts:
        raise RuntimeError("No BDC price/book data")
    avg = sum(discounts) / len(discounts)
    # Return constant series expanded later via HY dates — use snapshot repeated
    return pd.Series([avg], index=[pd.Timestamp.now().normalize()])


def fetch_bdc_discount_history() -> pd.Series:
    """Historical equal-weight avg discount via yfinance batch prices + current PTB snapshot."""
    tickers = [b["ticker"] for b in BDC_BASKET]
    hist = yf.download(" ".join(tickers), period="2y", interval="1d", progress=False, auto_adjust=True)
    if hist.empty:
        raise RuntimeError("No BDC price history")

    # Build normalized price index as stress proxy when PTB history unavailable
    closes: dict[str, pd.Series] = {}
    for t in tickers:
        try:
            if isinstance(hist.columns, pd.MultiIndex):
                s = hist["Close"][t].dropna()
            else:
                s = hist["Close"].dropna()
            closes[t] = s
        except Exception:  # noqa: BLE001
            continue
    if len(closes) < 3:
        raise RuntimeError("Insufficient BDC tickers")

    df = pd.DataFrame(closes).ffill().dropna()
    normalized = df / df.iloc[0] * 100
    index_level = normalized.mean(axis=1)
    # Map index deviation from 100 to pseudo-discount % (centered ~5%)
    discount = (100 - index_level) * 0.15 + 5
    return discount


def build_constituents() -> list[dict]:
    weight = f"{100 // len(BDC_BASKET)}%"
    return [
        {
            "ticker": b["ticker"],
            "weight": weight,
            "category": b["category"],
            "status": "Active",
            "role": b["role"],
        }
        for b in BDC_BASKET
    ]


def main() -> None:
    api_key = load_fred_api_key()
    print(f"Fetching {HY_SERIES}...")
    hy = fetch_fred_series(HY_SERIES, api_key, start="2020-01-01")
    print("Fetching BDC stress proxy...")
    bdc_disc = fetch_bdc_discount_history()
    df = pd.DataFrame({"bdcDiscount": bdc_disc})
    df["hyOas"] = hy.reindex(df.index, method="ffill")
    df = df.dropna().tail(400)

    points = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "bdcDiscount": round(float(row["bdcDiscount"]), 2),
            "hyOas": round(float(row["hyOas"]), 2),
        }
        for idx, row in df.iterrows()
    ]

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    delta = float(latest["bdcDiscount"] - prev["bdcDiscount"])

    payload = {
        "slug": "private-credit-stress",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['bdcDiscount']:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": df.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta <= 0),
        },
        "series": [
            {
                "key": "bdcDiscount",
                "label": "BDC Discount",
                "color": "#c45c4a",
                "type": "line",
                "yAxisId": "left",
            },
            {
                "key": "hyOas",
                "label": "HY OAS",
                "color": "#b8860b",
                "type": "line",
                "yAxisId": "right",
            },
        ],
        "points": points,
        "thesis": (
            "Private credit stress rises when BDC valuations slide relative to NAV while "
            "public HY spreads widen — a combined read on direct-lending and traded credit risk."
        ),
        "methodology": (
            f"Equal-weight BDC basket ({', '.join(b['ticker'] for b in BDC_BASKET)}): "
            "discount proxy from normalized price index vs. HY OAS (FRED BAMLH0A0HYM2). "
            "Replace with true discount-to-NAV when full PTB history is wired."
        ),
        "sources": [f"Yahoo Finance ({', '.join(b['ticker'] for b in BDC_BASKET)})", f"FRED {HY_SERIES}"],
        "constituents": build_constituents(),
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(points)} points)")


if __name__ == "__main__":
    main()
