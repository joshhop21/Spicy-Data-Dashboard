"""Offline sample for Bitcoin Liquidity Model."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "btc-liquidity-model.json"


def main() -> None:
    start = datetime(2015, 1, 2)
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    points = []
    i = 0
    d = start
    while d <= today:
        t = i / 20
        fair = 8000 + i * 220 + math.sin(t) * 12000
        btc = fair * (0.72 + 0.28 * math.sin(t + 0.5))
        z = (math.log(max(btc, 1)) - math.log(max(fair, 1))) / 0.37
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "btcActual": round(btc, 2),
                "modelFair": round(fair, 2),
                "band1Low": round(fair * 0.69, 2),
                "band1High": round(fair * 1.45, 2),
                "band2Low": round(fair * 0.5, 2),
                "band2High": round(fair * 1.75, 2),
                "zScore": round(z, 2),
                "fedNetLiqT": round(2.8 + i * 0.0045, 2),
                "globalM2Yoy": round(4.5 + math.sin(t) * 3.5, 2),
                "stableSupplyB": round(8 + i * 0.52, 2),
            }
        )
        i += 1
        d += timedelta(days=7)

    latest = points[-1]
    z = latest["zScore"]
    if z <= -1.5:
        signal = "Strong Cheap"
    elif z >= 1.5:
        signal = "Strong Dear"
    elif z < -0.5:
        signal = "Cheap"
    elif z > 0.5:
        signal = "Dear"
    else:
        signal = "Fair"

    payload = {
        "slug": "btc-liquidity-model",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "btcActual": round(latest["btcActual"]),
            "fairValue": round(latest["modelFair"]),
            "rangeLow": round(latest["band1Low"]),
            "rangeHigh": round(latest["band1High"]),
            "extremeLow": round(latest["band2Low"]),
            "extremeHigh": round(latest["band2High"]),
            "signal": signal,
            "vsFairPct": round((latest["btcActual"] / latest["modelFair"] - 1) * 100, 2),
            "zScore": latest["zScore"],
        },
        "cards": {
            "fedNetLiqT": round(latest["fedNetLiqT"], 1),
            "globalM2Yoy": round(latest["globalM2Yoy"], 2),
            "stableSupplyB": round(latest["stableSupplyB"], 1),
            "stable30dPct": round(
                (latest["stableSupplyB"] / points[-5]["stableSupplyB"] - 1) * 100
                if len(points) >= 5
                else 0,
                2,
            ),
        },
        "modelStats": {"r2": 0.891, "observations": len(points), "residualSigma": 0.369},
        "coefficients": [],
        "methodology": "Sample data — run fetch_btc_liquidity_model.py with FRED_API_KEY.",
        "sources": ["Sample generator"],
        "points": points,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT} ({len(points)} weeks, through {latest['date']})")


if __name__ == "__main__":
    main()
