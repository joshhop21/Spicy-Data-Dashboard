"""
Gold Fair Value Algorithm — actual gold vs. model fair value.

Actual: FRED London PM gold (GOLDPMGBD228NLBM)
Model (proxy): 2650 − 280 × 10Y TIPS real yield (DFII10) until Porter formula is provided.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from fred_utils import fetch_fred_series, load_fred_api_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "gold-fair-value.json"

GOLD_SERIES = "GOLDPMGBD228NLBM"
REAL_YIELD_SERIES = "DFII10"  # 10-year TIPS yield


def compute_model_fv(real_yield: pd.Series) -> pd.Series:
    """Simple inverse real-yield fair value proxy (USD/oz)."""
    return 2650 - 280 * real_yield


def build_payload(df: pd.DataFrame) -> dict:
    df = df.dropna().tail(500)
    points = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "actual": round(float(row["actual"]), 2),
            "model": round(float(row["model"]), 2),
        }
        for idx, row in df.iterrows()
    ]

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    delta = float(latest["actual"] - prev["actual"])

    return {
        "slug": "gold-fair-value",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"${latest['actual']:,.0f}",
            "delta": f"{delta:+,.0f}",
            "deltaDate": df.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta >= 0),
        },
        "series": [
            {
                "key": "actual",
                "label": "Gold Actual",
                "color": "#b8860b",
                "type": "line",
            },
            {
                "key": "model",
                "label": "Model",
                "color": "#b8860b",
                "type": "line",
                "strokeDasharray": "4 4",
            },
        ],
        "points": points,
        "thesis": (
            "Gold tends to reprice against real rates and liquidity conditions. When spot gold "
            "trades well above model fair value, the market may be pricing hedge demand or "
            "supply stress beyond baseline macro inputs."
        ),
        "methodology": (
            f"Actual: FRED {GOLD_SERIES} ($/oz). Model proxy: 2650 − 280 × {REAL_YIELD_SERIES} "
            "(10-year TIPS yield, %). Replace with Porter's gold FV algorithm when provided."
        ),
        "sources": [f"FRED {GOLD_SERIES}", f"FRED {REAL_YIELD_SERIES}"],
    }


def main() -> None:
    api_key = load_fred_api_key()
    print(f"Fetching {GOLD_SERIES} and {REAL_YIELD_SERIES}...")
    gold = fetch_fred_series(GOLD_SERIES, api_key, start="2020-01-01")
    real_yield = fetch_fred_series(REAL_YIELD_SERIES, api_key, start="2020-01-01")

    df = pd.DataFrame({"actual": gold})
    df["model"] = compute_model_fv(real_yield.reindex(df.index, method="ffill"))
    df = df.dropna()

    payload = build_payload(df)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points)")


if __name__ == "__main__":
    main()
