"""
Inflation Today vs. 1970s — CPI YoY overlay (2014–present vs. 1966–1986).
FRED series: CPIAUCSL (seasonally adjusted CPI, all items).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "inflation-70s.json"

FRED_SERIES = "CPIAUCSL"
MODERN_START = "2014-01-01"
SEVENTIES_START = "1966-01-01"
SEVENTIES_END = "1986-12-31"


def load_fred_api_key() -> str:
    key = os.environ.get("FRED_API_KEY")
    if key:
        return key.strip()
    env_local = ROOT / ".env.local"
    if env_local.exists():
        for line in env_local.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("FRED_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("FRED_API_KEY not set (GitHub secret or .env.local)")


def fetch_cpi_levels(api_key: str) -> pd.Series:
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": FRED_SERIES,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": "1965-01-01",
    }
    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    rows = []
    for obs in resp.json().get("observations", []):
        val = obs.get("value")
        if val in (".", None, ""):
            continue
        rows.append((pd.Timestamp(obs["date"]), float(val)))
    if not rows:
        raise RuntimeError("No CPI observations from FRED")
    series = pd.Series(dict(rows)).sort_index()
    series.index = pd.to_datetime(series.index)
    return series


def cpi_yoy(levels: pd.Series) -> pd.Series:
    yoy = (levels / levels.shift(12) - 1.0) * 100.0
    return yoy.dropna()


def build_overlay(now: pd.Series, seventies: pd.Series) -> pd.DataFrame:
    """Align by month index: modern month i vs 70s month i."""
    n = min(len(now), len(seventies))
    records = []
    for i in range(n):
        date = now.index[i]
        records.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "cpiNow": round(float(now.iloc[i]), 2),
                "cpi70s": round(float(seventies.iloc[i]), 2),
            }
        )
    # Extend modern-only tail without 70s comparison
    for i in range(n, len(now)):
        date = now.index[i]
        records.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "cpiNow": round(float(now.iloc[i]), 2),
                "cpi70s": None,
            }
        )
    return pd.DataFrame(records)


def build_payload(df: pd.DataFrame) -> dict:
    valid = df.dropna(subset=["cpiNow"])
    latest_idx = valid.index[-1]
    latest = valid.loc[latest_idx]
    prev = valid.iloc[-2] if len(valid) > 1 else latest
    delta_pct = float(latest["cpiNow"] - prev["cpiNow"])

    return {
        "slug": "inflation-70s",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest['cpiNow']:.1f}%",
            "delta": f"{delta_pct:+.1f}%",
            "deltaDate": pd.Timestamp(latest["date"]).strftime("%b %y"),
            "deltaPositive": bool(delta_pct >= 0),
        },
        "series": [
            {
                "key": "cpiNow",
                "label": "CPI Now",
                "color": "#4a6fa5",
                "type": "line",
            },
            {
                "key": "cpi70s",
                "label": "70s",
                "color": "#b8860b",
                "type": "line",
            },
        ],
        "points": df.to_dict(orient="records"),
        "thesis": (
            "Overlaying today's CPI year-over-year path on the 1966–1986 experience "
            "helps frame whether inflation dynamics rhyme with the 1970s cycle."
        ),
        "methodology": (
            f"CPI YoY % from FRED {FRED_SERIES} (seasonally adjusted, all items). "
            f"Blue: {MODERN_START}–present. Gold: {SEVENTIES_START}–{SEVENTIES_END}, "
            "aligned by month index (month 1 of modern vs month 1 of the 70s window)."
        ),
        "sources": [f"FRED {FRED_SERIES}"],
    }


def main() -> None:
    api_key = load_fred_api_key()
    print(f"Fetching {FRED_SERIES} from FRED...")
    levels = fetch_cpi_levels(api_key)
    yoy = cpi_yoy(levels)

    now = yoy.loc[MODERN_START:]
    seventies = yoy.loc[SEVENTIES_START:SEVENTIES_END]

    if now.empty or seventies.empty:
        raise RuntimeError("Insufficient CPI YoY history")

    df = build_overlay(now, seventies)
    payload = build_payload(df)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points)")


if __name__ == "__main__":
    main()
