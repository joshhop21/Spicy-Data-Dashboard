"""2s10s yield curve — FRED T10Y2Y (10Y minus 2Y Treasury spread)."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from fred_utils import fetch_fred_series, load_fred_api_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "yield-2s10s.json"
SERIES = "T10Y2Y"


def main() -> None:
    api_key = load_fred_api_key()
    spread = fetch_fred_series(SERIES, api_key, start="2000-01-01").tail(500)
    points = [
        {"date": idx.strftime("%Y-%m-%d"), "spread": round(float(v), 2)} for idx, v in spread.items()
    ]
    latest, prev = spread.iloc[-1], spread.iloc[-2]
    delta = float(latest - prev)
    payload = {
        "slug": "yield-2s10s",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest:.2f}%",
            "delta": f"{delta:+.2f}%",
            "deltaDate": spread.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta >= 0),
        },
        "series": [{"key": "spread", "label": "2s10s", "color": "#6b7c4c", "type": "line"}],
        "points": points,
        "referenceLine": {"value": 0, "label": "0%"},
        "thesis": "The 2s10s spread inverts when short rates exceed long rates — a classic recession watch signal.",
        "methodology": f"FRED {SERIES} — 10-year Treasury constant maturity minus 2-year (%).",
        "sources": [f"FRED {SERIES}"],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(points)} points)")


if __name__ == "__main__":
    main()
