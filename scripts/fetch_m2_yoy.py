"""M2 Money Supply YoY — FRED M2SL."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from fred_utils import fetch_fred_series, load_fred_api_key, compute_m2_yoy  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "m2-yoy.json"
SERIES = "M2SL"


def main() -> None:
    api_key = load_fred_api_key()
    levels = fetch_fred_series(SERIES, api_key, start="2000-01-01")
    yoy = compute_m2_yoy(levels).dropna().tail(500)
    points = [{"date": idx.strftime("%Y-%m-%d"), "m2yoy": round(float(v), 2)} for idx, v in yoy.items()]
    latest, prev = yoy.iloc[-1], yoy.iloc[-2]
    delta = float(latest - prev)
    payload = {
        "slug": "m2-yoy",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": yoy.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta >= 0),
        },
        "series": [{"key": "m2yoy", "label": "M2 YoY", "color": "#4a6fa5", "type": "line"}],
        "points": points,
        "thesis": "M2 growth tracks liquidity entering the financial system — a monetary plumbing signal.",
        "methodology": f"FRED {SERIES} year-over-year % change (12-month).",
        "sources": [f"FRED {SERIES}"],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(points)} points)")


if __name__ == "__main__":
    main()
