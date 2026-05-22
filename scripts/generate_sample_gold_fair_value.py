"""Offline fallback for gold fair value chart."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "gold-fair-value.json"


def main() -> None:
    start = datetime(2022, 1, 1)
    points = []
    for i in range(200):
        d = start + timedelta(days=7 * i)
        t = i / 15
        actual = 1800 + i * 3 + math.sin(t) * 80
        model = actual - 40 + math.cos(t) * 30
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "actual": round(actual, 2),
                "model": round(model, 2),
            }
        )

    latest = points[-1]
    prev = points[-2]
    delta = latest["actual"] - prev["actual"]

    payload = {
        "slug": "gold-fair-value",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"${latest['actual']:,.0f}",
            "delta": f"{delta:+,.0f}",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta >= 0,
        },
        "series": [
            {"key": "actual", "label": "Gold Actual", "color": "#b8860b", "type": "line"},
            {"key": "model", "label": "Model", "color": "#b8860b", "type": "line", "strokeDasharray": "4 4"},
        ],
        "points": points,
        "thesis": "Sample gold fair value chart for local development.",
        "methodology": "Sample generator — run fetch_gold_fair_value.py with FRED_API_KEY.",
        "sources": ["Sample generator"],
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
