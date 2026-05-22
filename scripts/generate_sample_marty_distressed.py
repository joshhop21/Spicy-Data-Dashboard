"""Offline fallback for Marty distressed ratio."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "marty-distressed.json"


def main() -> None:
    start = datetime(2020, 1, 1)
    points = []
    for i in range(200):
        d = start + timedelta(days=7 * i)
        t = i / 10
        ratio = 5 + math.sin(t) * 2 + (3 if i > 20 and i < 30 else 0)
        points.append({"date": d.strftime("%Y-%m-%d"), "ratio": round(ratio, 2)})

    latest = points[-1]
    prev = points[-2]
    delta = latest["ratio"] - prev["ratio"]

    payload = {
        "slug": "marty-distressed",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['ratio']:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta >= 0,
        },
        "series": [{"key": "ratio", "label": "Distressed %", "color": "#c45c4a", "type": "area"}],
        "points": points,
        "referenceLine": {"value": 6, "label": "6%"},
        "thesis": "Sample Marty distressed ratio for local development.",
        "methodology": "Sample generator — run fetch_marty_distressed.py with FRED_API_KEY.",
        "sources": ["Sample generator"],
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
