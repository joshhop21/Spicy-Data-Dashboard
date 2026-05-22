"""
Marty's Distressed Debt Ratio — % of HY bonds at distressed levels (proxy).

Uses FRED ICE BofA HY OAS (BAMLH0A0HYM2) and CCC-tier OAS (BAMLH0A3HYC):
  ratio ≈ 2 + 0.85 × (CCC OAS − HY OAS), clipped to [0, 25]

Replace with Porter's official series when Jared provides the exact definition.
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
OUT = ROOT / "data" / "marty-distressed.json"

HY_OAS = "BAMLH0A0HYM2"
CCC_OAS = "BAMLH0A3HYC"
REFERENCE_LINE = 6.0


def compute_distressed_ratio(hy_oas: pd.Series, ccc_oas: pd.Series) -> pd.Series:
    df = pd.DataFrame({"hy": hy_oas, "ccc": ccc_oas}).dropna()
    spread = df["ccc"] - df["hy"]
    ratio = 2.0 + 0.85 * spread
    return ratio.clip(0, 25)


def build_payload(ratio: pd.Series) -> dict:
    ratio = ratio.dropna().tail(500)
    points = [
        {"date": idx.strftime("%Y-%m-%d"), "ratio": round(float(val), 2)}
        for idx, val in ratio.items()
    ]

    latest = ratio.iloc[-1]
    prev = ratio.iloc[-2] if len(ratio) > 1 else latest
    delta = float(latest - prev)

    return {
        "slug": "marty-distressed",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": ratio.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta >= 0),
        },
        "series": [
            {
                "key": "ratio",
                "label": "Distressed %",
                "color": "#c45c4a",
                "type": "area",
            }
        ],
        "points": points,
        "referenceLine": {"value": REFERENCE_LINE, "label": "6%"},
        "thesis": (
            "The distressed debt ratio tracks how much of the U.S. high-yield market trades at "
            "stressed spreads. Rising readings above 6% often coincide with late-cycle credit "
            "fragility."
        ),
        "methodology": (
            f"Proxy formula from FRED: 2 + 0.85 × ({CCC_OAS} − {HY_OAS}), clipped to 0–25%. "
            "Pending replacement with Porter's official Marty ratio when provided."
        ),
        "sources": [f"FRED {HY_OAS}", f"FRED {CCC_OAS}"],
    }


def main() -> None:
    api_key = load_fred_api_key()
    print(f"Fetching {HY_OAS} and {CCC_OAS} from FRED...")
    hy = fetch_fred_series(HY_OAS, api_key, start="2000-01-01")
    ccc = fetch_fred_series(CCC_OAS, api_key, start="2000-01-01")
    ratio = compute_distressed_ratio(hy, ccc)
    payload = build_payload(ratio)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points, latest {payload['headline']['value']})")


if __name__ == "__main__":
    main()
