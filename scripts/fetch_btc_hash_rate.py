"""
Fetch BTC-USD (yfinance) and Bitcoin hash rate (blockchain.com).
Writes data/btc-hash-rate.json for the Next.js dashboard.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "btc-hash-rate.json"

HASH_RATE_URL = (
    "https://api.blockchain.info/charts/hash-rate"
    "?timespan=2years&rollingAverage=7days&format=json"
)
BTC_PRICE_URL = (
    "https://api.blockchain.info/charts/market-price"
    "?timespan=2years&rollingAverage=1days&format=json"
)
COINGECKO_URL = (
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    "?vs_currency=usd&days=730&interval=daily"
)


def fetch_btc_prices_blockchain() -> pd.Series:
    resp = requests.get(BTC_PRICE_URL, timeout=60)
    resp.raise_for_status()
    values = resp.json().get("values", [])
    rows = []
    for row in values:
        ts = datetime.fromtimestamp(row["x"], tz=timezone.utc).replace(tzinfo=None)
        rows.append((ts, float(row["y"])))
    return pd.Series({ts: val for ts, val in rows}).sort_index()


def fetch_btc_prices_coingecko() -> pd.Series:
    resp = requests.get(COINGECKO_URL, timeout=60)
    resp.raise_for_status()
    prices = resp.json().get("prices", [])
    rows = []
    for ms, price in prices:
        ts = datetime.fromtimestamp(ms / 1000, tz=timezone.utc).replace(tzinfo=None)
        rows.append((ts, float(price)))
    return pd.Series({ts: val for ts, val in rows}).sort_index()


def fetch_btc_prices() -> pd.Series:
    sources = [
        ("yfinance", lambda: _fetch_btc_yfinance()),
        ("coingecko", fetch_btc_prices_coingecko),
        ("blockchain.com", fetch_btc_prices_blockchain),
    ]
    errors: list[str] = []
    for name, fn in sources:
        try:
            series = fn()
            if not series.empty:
                print(f"BTC prices from {name}")
                return series
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: {exc}")
    raise RuntimeError("All BTC price sources failed: " + "; ".join(errors))


def _fetch_btc_yfinance() -> pd.Series:
    hist = yf.download("BTC-USD", period="2y", interval="1d", progress=False)
    if hist.empty:
        raise RuntimeError("empty yfinance response")
    close = hist["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close


def fetch_hash_rate() -> pd.Series:
    resp = requests.get(HASH_RATE_URL, timeout=60)
    resp.raise_for_status()
    values = resp.json().get("values", [])
    rows = []
    for row in values:
        ts = datetime.fromtimestamp(row["x"], tz=timezone.utc).replace(tzinfo=None)
        # API returns hash rate; scale to EH/s (exahashes per second)
        eh_per_s = row["y"] / 1e18
        rows.append((ts, eh_per_s))
    series = pd.Series({ts: val for ts, val in rows}).sort_index()
    return series


def build_payload(btc: pd.Series, hashrate: pd.Series) -> dict:
    df = pd.DataFrame({"btc": btc})
    df["hashRate"] = hashrate.reindex(df.index, method="ffill")
    df = df.dropna(subset=["btc"])
    df = df.tail(400)

    points = []
    for idx, row in df.iterrows():
        points.append(
            {
                "date": idx.strftime("%Y-%m-%d"),
                "btc": round(float(row["btc"]), 2),
                "hashRate": round(float(row["hashRate"]), 1) if pd.notna(row["hashRate"]) else None,
            }
        )

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    delta_pct = ((latest["btc"] - prev["btc"]) / prev["btc"]) * 100

    return {
        "slug": "btc-hash-rate",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"${latest['btc']:,.0f}",
            "delta": f"{delta_pct:+.1f}%",
            "deltaDate": df.index[-1].strftime("%b %y"),
            "deltaPositive": delta_pct >= 0,
        },
        "series": [
            {
                "key": "btc",
                "label": "BTC Price",
                "color": "#b8860b",
                "type": "line",
                "yAxisId": "left",
            },
            {
                "key": "hashRate",
                "label": "Hash Rate",
                "color": "#6b7c4c",
                "type": "line",
                "yAxisId": "right",
                "strokeDasharray": "4 4",
            },
        ],
        "points": points,
        "thesis": (
            "Bitcoin price and network hash rate tend to move together over long cycles. "
            "Divergences can signal stress or opportunity in crypto mining economics."
        ),
        "methodology": (
            "BTC-USD daily close from Yahoo Finance. Hash rate is the 7-day rolling average "
            "from blockchain.com, converted to exahashes per second (EH/s)."
        ),
        "sources": [
            "Yahoo Finance (BTC-USD) or blockchain.com market-price",
            "blockchain.com charts API (hash-rate)",
        ],
    }


def main() -> None:
    try:
        btc = fetch_btc_prices()
        hashrate = fetch_hash_rate()
        payload = build_payload(btc, hashrate)
    except Exception as exc:  # noqa: BLE001
        print(f"Live fetch failed ({exc}). Run generate_sample_btc.py for offline data.")
        raise
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points)")


if __name__ == "__main__":
    main()
