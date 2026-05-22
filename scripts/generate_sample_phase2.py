"""Generate sample JSON for all Phase 2 charts (offline fallback)."""
import json
import math
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def write(slug: str, payload: dict) -> None:
    path = DATA / f"{slug}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {path}")


def gen_series(start: datetime, n: int, fn) -> list[dict]:
    return [
        {"date": (start + timedelta(days=7 * i)).strftime("%Y-%m-%d"), **fn(i)}
        for i in range(n)
    ]


def main() -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    pts = gen_series(datetime(2018, 1, 1), 200, lambda i: {"oas": round(3.5 + math.sin(i / 10) * 2, 2)})
    write(
        "hy-oas",
        {
            "slug": "hy-oas",
            "updatedAt": now,
            "headline": {"value": "4.2%", "delta": "-0.1%", "deltaDate": "Mar 26", "deltaPositive": True},
            "series": [{"key": "oas", "label": "HY OAS", "color": "#c45c4a", "type": "area"}],
            "points": pts,
            "thesis": "Sample HY OAS.",
            "methodology": "Sample — run fetch_hy_oas.py",
            "sources": ["Sample"],
        },
    )

    pts = gen_series(datetime(2015, 1, 1), 200, lambda i: {"m2yoy": round(5 + math.sin(i / 12) * 8, 2)})
    write(
        "m2-yoy",
        {
            "slug": "m2-yoy",
            "updatedAt": now,
            "headline": {"value": "3.1%", "delta": "+0.2%", "deltaDate": "Mar 26", "deltaPositive": True},
            "series": [{"key": "m2yoy", "label": "M2 YoY", "color": "#4a6fa5", "type": "line"}],
            "points": pts,
            "thesis": "Sample M2 YoY.",
            "methodology": "Sample — run fetch_m2_yoy.py",
            "sources": ["Sample"],
        },
    )

    pts = gen_series(datetime(2015, 1, 1), 200, lambda i: {"spread": round(0.5 + math.sin(i / 15) * 1.2, 2)})
    write(
        "yield-2s10s",
        {
            "slug": "yield-2s10s",
            "updatedAt": now,
            "headline": {"value": "0.45%", "delta": "+0.05%", "deltaDate": "Mar 26", "deltaPositive": True},
            "series": [{"key": "spread", "label": "2s10s", "color": "#6b7c4c", "type": "line"}],
            "points": pts,
            "referenceLine": {"value": 0, "label": "0%"},
            "thesis": "Sample 2s10s.",
            "methodology": "Sample — run fetch_yield_2s10s.py",
            "sources": ["Sample"],
        },
    )

    pts = gen_series(
        datetime(2020, 1, 1),
        200,
        lambda i: {
            "bdcDiscount": round(8 + math.sin(i / 8) * 3, 2),
            "hyOas": round(4 + math.cos(i / 10) * 1.5, 2),
        },
    )
    write(
        "private-credit-stress",
        {
            "slug": "private-credit-stress",
            "updatedAt": now,
            "headline": {"value": "9.2%", "delta": "-0.3%", "deltaDate": "Mar 26", "deltaPositive": True},
            "series": [
                {"key": "bdcDiscount", "label": "BDC Discount", "color": "#c45c4a", "type": "line", "yAxisId": "left"},
                {"key": "hyOas", "label": "HY OAS", "color": "#b8860b", "type": "line", "yAxisId": "right"},
            ],
            "points": pts,
            "thesis": "Sample private credit stress.",
            "methodology": "Sample — run fetch_private_credit_stress.py",
            "sources": ["Sample"],
            "constituents": [
                {"ticker": t, "weight": "14%", "category": "BDC", "status": "Active", "role": "Private credit"}
                for t in ["OBDC", "ARCC", "BXSL", "GBDC", "FSK", "TSLX", "MAIN"]
            ],
        },
    )


if __name__ == "__main__":
    main()
