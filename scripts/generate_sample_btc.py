"""Offline fallback: sample BTC + hash rate series when APIs are unavailable."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "btc-hash-rate.json"


def main() -> None:
    start = datetime(2024, 1, 1)
    points = []
    for i in range(450):
        d = start + timedelta(days=i)
        t = i / 30
        btc = 28000 + i * 35 + math.sin(t) * 4000 + math.cos(t / 2) * 2000
        hashrate = 400 + i * 0.35 + math.sin(t / 3) * 40
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "btc": round(btc, 2),
                "hashRate": round(hashrate, 1),
            }
        )

    latest = points[-1]
    prev = points[-2]
    delta_pct = ((latest["btc"] - prev["btc"]) / prev["btc"]) * 100

    payload = {
        "slug": "btc-hash-rate",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"${latest['btc']:,.0f}",
            "delta": f"{delta_pct:+.1f}%",
            "deltaDate": datetime.strptime(latest["date"], "%Y-%m-%d").strftime("%b %y"),
            "deltaPositive": delta_pct >= 0,
        },
        "series": [
            {
                "key": "btc",
                "label": "BTC Price",
                "color": "#b8860b",
                "type": "line",
                "yAxisId": "left",
            },
            {
                "key": "hashRate",
                "label": "Hash Rate",
                "color": "#6b7c4c",
                "type": "line",
                "yAxisId": "right",
                "strokeDasharray": "4 4",
            },
        ],
        "points": points,
        "thesis": (
            "Bitcoin price and network hash rate tend to move together over long cycles. "
            "Divergences can signal stress or opportunity in crypto mining economics."
        ),
        "methodology": (
            "SAMPLE DATA for local development. Production uses Yahoo Finance / CoinGecko "
            "and blockchain.com via scripts/fetch_btc_hash_rate.py."
        ),
        "sources": ["Sample generator (replace via nightly fetch)"],
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
