"""Offline sample for Bitcoin Liquidity Model."""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "btc-liquidity-model.json"


def main() -> None:
    start = datetime(2017, 8, 1)
    points = []
    for i in range(450):
        d = start + timedelta(days=7 * i)
        t = i / 20
        fair = 30000 + i * 180 + math.sin(t) * 8000
        btc = fair * (0.75 + 0.25 * math.sin(t + 0.5))
        z = (math.log(btc) - math.log(fair)) / 0.37
        points.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "btcActual": round(btc, 2),
                "modelFair": round(fair, 2),
                "band1Low": round(fair * 0.75, 2),
                "band1High": round(fair * 1.35, 2),
                "band2Low": round(fair * 0.55, 2),
                "band2High": round(fair * 1.65, 2),
                "zScore": round(z, 2),
                "fedNetLiqT": round(3.5 + i * 0.005, 2),
                "globalM2Yoy": round(5 + math.sin(t) * 4, 2),
                "stableSupplyB": round(50 + i * 0.45, 2),
            }
        )

    latest = points[-1]
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
            "signal": "Strong Cheap",
            "vsFairPct": round((latest["btcActual"] / latest["modelFair"] - 1) * 100, 2),
            "zScore": latest["zScore"],
        },
        "cards": {
            "fedNetLiqT": 5.9,
            "globalM2Yoy": 8.19,
            "stableSupplyB": 266.1,
            "stable30dPct": -0.05,
        },
        "modelStats": {"r2": 0.891, "observations": 478, "residualSigma": 0.369},
        "coefficients": [],
        "methodology": "Sample data — run fetch_btc_liquidity_model.py with FRED_API_KEY.",
        "sources": ["Sample generator"],
        "points": points,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote sample {OUT}")


if __name__ == "__main__":
    main()
