"""Write placeholder JSON for charts not yet wired to fetch scripts."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

PLACEHOLDERS = [
    {
        "slug": "marty-distressed",
        "title_value": "8.1%",
        "series": [{"key": "ratio", "label": "Distressed %", "color": "#c45c4a", "type": "area"}],
        "referenceLine": {"value": 6, "label": "6%"},
    },
    {
        "slug": "cdci",
        "title_value": "142",
        "series": [
            {"key": "cdci", "label": "CDCI", "color": "#c45c4a", "type": "line", "yAxisId": "left"},
            {"key": "gold", "label": "Gold", "color": "#b8860b", "type": "line", "yAxisId": "right"},
        ],
        "constituents": [
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
        ],
    },
    {
        "slug": "berkshire-roe",
        "title_value": "22.4%",
        "series": [{"key": "roe", "label": "Rolling 10y ROE", "color": "#b8860b", "type": "area"}],
        "referenceLine": {"value": 20, "label": "20%"},
    },
    {
        "slug": "inflation-70s",
        "title_value": "3.2%",
        "series": [
            {"key": "cpiNow", "label": "CPI Now", "color": "#4a6fa5", "type": "line"},
            {"key": "cpi70s", "label": "70s", "color": "#b8860b", "type": "line"},
        ],
    },
    {
        "slug": "gold-fair-value",
        "title_value": "$2,340",
        "series": [
            {"key": "actual", "label": "Gold Actual", "color": "#b8860b", "type": "line"},
            {"key": "model", "label": "Model", "color": "#b8860b", "type": "line", "strokeDasharray": "4 4"},
        ],
    },
]


def empty_points():
    return []


def base_payload(item: dict) -> dict:
    payload = {
        "slug": item["slug"],
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": item["title_value"],
            "delta": "—",
            "deltaDate": "pending",
            "deltaPositive": True,
        },
        "series": item["series"],
        "points": empty_points(),
        "thesis": "Placeholder — connect fetch script and Jared's notes.",
        "methodology": "Placeholder — document formulas and data series when implemented.",
        "sources": [],
        "constituents": item.get("constituents", []),
    }
    if item.get("referenceLine") is not None:
        payload["referenceLine"] = item["referenceLine"]
    return payload


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    for item in PLACEHOLDERS:
        path = DATA / f"{item['slug']}.json"
        path.write_text(json.dumps(base_payload(item), indent=2), encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
