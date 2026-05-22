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
