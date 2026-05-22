"""High Yield OAS — FRED BAMLH0A0HYM2."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from fred_utils import fetch_fred_series, load_fred_api_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "hy-oas.json"
SERIES = "BAMLH0A0HYM2"


def main() -> None:
    api_key = load_fred_api_key()
    oas = fetch_fred_series(SERIES, api_key, start="2010-01-01").tail(500)
    points = [{"date": idx.strftime("%Y-%m-%d"), "oas": round(float(v), 2)} for idx, v in oas.items()]
    latest, prev = oas.iloc[-1], oas.iloc[-2]
    delta = float(latest - prev)
    payload = {
        "slug": "hy-oas",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest:.2f}%",
            "delta": f"{delta:+.2f}%",
            "deltaDate": oas.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta <= 0),
        },
        "series": [{"key": "oas", "label": "HY OAS", "color": "#c45c4a", "type": "area"}],
        "points": points,
        "thesis": "High-yield option-adjusted spread is a core gauge of corporate credit stress.",
        "methodology": f"FRED {SERIES}, ICE BofA US High Yield Master II OAS (%).",
        "sources": [f"FRED {SERIES}"],
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(points)} points)")


if __name__ == "__main__":
    main()
