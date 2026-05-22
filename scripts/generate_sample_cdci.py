"""Offline fallback CDCI + gold sample series."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "cdci.json"

CONSTITUENTS = [
    {"ticker": "COF", "weight": "10%", "category": "Consumer credit", "status": "Active", "role": "Issuer"},
    {"ticker": "SYF", "weight": "10%", "category": "Consumer credit", "status": "Active", "role": "Issuer"},
    {"ticker": "AXP", "weight": "10%", "category": "Consumer credit", "status": "Active", "role": "Issuer"},
    {"ticker": "ALLY", "weight": "10%", "category": "Consumer credit", "status": "Active", "role": "Issuer"},
    {"ticker": "BAC", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
    {"ticker": "JPM", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
    {"ticker": "C", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
    {"ticker": "WFC", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
    {"ticker": "USB", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
    {"ticker": "PNC", "weight": "10%", "category": "Bank", "status": "Active", "role": "Exposure"},
]


def main() -> None:
    start = datetime(2023, 10, 1)
    points = []
    for i in range(400):
        d = start + timedelta(days=i)
        t = i / 40
        cdci = 100 + math.sin(t) * 8 + i * 0.02
        gold = 1800 + i * 1.2 + math.cos(t / 2) * 60
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "cdci": round(cdci, 2),
                "gold": round(gold, 2),
            }
        )

    latest = points[-1]
    prev = points[-2]
    delta_pct = ((latest["cdci"] - prev["cdci"]) / prev["cdci"]) * 100

    payload = {
        "slug": "cdci",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['cdci']:.1f}",
            "delta": f"{delta_pct:+.1f}%",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta_pct >= 0,
        },
        "series": [
            {"key": "cdci", "label": "CDCI", "color": "#c45c4a", "type": "line", "yAxisId": "left"},
            {"key": "gold", "label": "Gold", "color": "#b8860b", "type": "line", "yAxisId": "right"},
        ],
        "points": points,
        "thesis": "Sample CDCI data for local development.",
        "methodology": "Sample generator — run fetch_cdci.py for live data.",
        "sources": ["Sample generator"],
        "constituents": CONSTITUENTS,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
