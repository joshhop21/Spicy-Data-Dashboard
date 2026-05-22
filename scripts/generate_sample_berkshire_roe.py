"""Offline fallback for Berkshire rolling 10y BVPS change."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "berkshire-roe.json"


def main() -> None:
    start = datetime(1996, 1, 1)
    points = []
    for i in range(350):
        d = start + timedelta(days=30 * i)
        t = i / 24
        roe = 18 + math.sin(t) * 6 + i * 0.01
        points.append({"date": d.strftime("%Y-%m-%d"), "roe": round(roe, 2)})

    latest = points[-1]
    prev = points[-2]
    delta = latest["roe"] - prev["roe"]

    payload = {
        "slug": "berkshire-roe",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['roe']:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta >= 0,
        },
        "series": [
            {"key": "roe", "label": "Rolling 10y ROE", "color": "#b8860b", "type": "area"}
        ],
        "points": points,
        "referenceLine": {"value": 20, "label": "20%"},
        "thesis": "Sample Berkshire BVPS change for local development.",
        "methodology": "Sample generator — run fetch_berkshire_roe.py for live data.",
        "sources": ["Sample generator"],
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
