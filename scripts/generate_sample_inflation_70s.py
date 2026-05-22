"""Offline fallback for inflation overlay chart."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "inflation-70s.json"


def main() -> None:
    start = datetime(2014, 1, 1)
    points = []
    for i in range(150):
        d = start + timedelta(days=30 * i)
        t = i / 12
        cpi_now = 1.5 + math.sin(t) * 2 + t * 0.15
        cpi_70s = 2.0 + math.sin(t + 0.5) * 3 + t * 0.2
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "cpiNow": round(cpi_now, 2),
                "cpi70s": round(cpi_70s, 2) if i < 120 else None,
            }
        )

    latest = points[-1]
    prev = points[-2]
    delta = latest["cpiNow"] - prev["cpiNow"]

    payload = {
        "slug": "inflation-70s",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['cpiNow']:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta >= 0,
        },
        "series": [
            {"key": "cpiNow", "label": "CPI Now", "color": "#4a6fa5", "type": "line"},
            {"key": "cpi70s", "label": "70s", "color": "#b8860b", "type": "line"},
        ],
        "points": points,
        "thesis": "Sample inflation overlay for local development.",
        "methodology": "Sample generator — run fetch_inflation_70s.py with FRED_API_KEY.",
        "sources": ["Sample generator"],
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
