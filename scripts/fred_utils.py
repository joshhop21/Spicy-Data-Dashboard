"""Shared helpers for FRED API scripts."""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]


def load_fred_api_key() -> str:
    key = os.environ.get("FRED_API_KEY")
    if key and key.strip() and "your_fred" not in key.lower():
        return key.strip()
    env_local = ROOT / ".env.local"
    if env_local.exists():
        for line in env_local.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("FRED_API_KEY="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val and "your_fred" not in val.lower():
                    return val
    raise RuntimeError("FRED_API_KEY not set (GitHub secret or .env.local)")


def fetch_fred_series(series_id: str, api_key: str, start: str = "2010-01-01") -> pd.Series:
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": start,
    }
    resp = requests.get(url, params=params, timeout=60)
    resp.raise_for_status()
    rows = []
    for obs in resp.json().get("observations", []):
        if obs.get("value") in (".", None, ""):
            continue
        rows.append((pd.Timestamp(obs["date"]), float(obs["value"])))
    if not rows:
        raise RuntimeError(f"No observations for {series_id}")
    return pd.Series(dict(rows)).sort_index()


def fetch_fred_csv(series_id: str, start: str = "2010-01-01") -> pd.Series:
    """Public FRED CSV export — no API key required."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    from io import StringIO

    df = pd.read_csv(StringIO(resp.text))
    if df.shape[1] < 2:
        raise RuntimeError(f"No CSV data for {series_id}")
    df.columns = ["date", "value"]
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna().set_index("date")["value"].sort_index()
    df = df[df.index >= pd.Timestamp(start)]
    if df.empty:
        raise RuntimeError(f"No CSV observations for {series_id}")
    return df


def fetch_fred_series_or_csv(series_id: str, api_key: str | None, start: str = "2010-01-01") -> pd.Series:
    if api_key:
        try:
            return fetch_fred_series(series_id, api_key, start=start)
        except Exception:
            pass
    return fetch_fred_csv(series_id, start=start)


def compute_m2_yoy(levels: pd.Series) -> pd.Series:
    """12-month YoY % for FRED M2SL — matches fetch_m2_yoy.py."""
    levels = levels.sort_index()
    return (levels / levels.shift(12) - 1) * 100


def m2_yoy_on_index(levels: pd.Series, index: pd.DatetimeIndex) -> pd.Series:
    """Forward-fill monthly M2 YoY onto a weekly (or daily) index."""
    yoy = compute_m2_yoy(levels).dropna()
    return yoy.reindex(index, method="ffill")
