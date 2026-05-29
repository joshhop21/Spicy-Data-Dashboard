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
    """Public FRED CSV download — no API key required."""
    from io import StringIO

    urls = [
        f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start}",
        f"https://fred.stlouisfed.org/series/{series_id}/downloaddata/{series_id}.csv",
    ]
    last_err: Exception | None = None
    for url in urls:
        try:
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()
            df = pd.read_csv(StringIO(resp.text))
            if df.shape[1] < 2:
                continue
            df.columns = ["date", "value"] + list(df.columns[2:])
            df = df[["date", "value"]]
            df["date"] = pd.to_datetime(df["date"])
            df["value"] = pd.to_numeric(df["value"], errors="coerce")
            df = df.dropna().set_index("date")["value"].sort_index()
            df = df[df.index >= pd.Timestamp(start)]
            if not df.empty:
                return df
        except Exception as exc:
            last_err = exc
    raise RuntimeError(f"No CSV observations for {series_id}") from last_err


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


def _to_monthly(series: pd.Series) -> pd.Series:
    return series.sort_index().resample("ME").last().dropna()


def _convert_m2_to_usd(
    m2_local_billions: pd.Series, fx: pd.Series, mode: str
) -> pd.Series:
    """Convert local-currency M2 (billions) to USD billions using FRED FX."""
    aligned = pd.DataFrame({"m2": m2_local_billions, "fx": fx}).sort_index().ffill().dropna()
    if mode == "multiply":
        return aligned["m2"] * aligned["fx"]
    if mode == "divide":
        return aligned["m2"] / aligned["fx"]
    raise ValueError(f"Unknown FX mode: {mode}")


def build_global_m2_usd_billions(api_key: str | None, start: str = "2010-01-01") -> pd.Series:
    """
    Global M2 in USD billions: US + Euro Area + Japan + China + UK.
    FRED M2 levels converted with monthly FX, then summed.
    """
    us = _to_monthly(fetch_fred_series_or_csv("M2SL", api_key, start=start))
    parts: list[pd.Series] = [us.rename("us")]

    # (label, M2 series, FX series, conversion)
    # DEXUSEU / DEXUSUK = USD per 1 EUR/GBP -> multiply
    # DEXJPUS / DEXCHUS = local currency per 1 USD -> divide
    regions = [
        ("ea", "MYAGM2EZM196N", "DEXUSEU", "multiply"),
        ("jp", "MYAGM2JPM189N", "DEXJPUS", "divide"),
        ("cn", "MYAGM2CNM189N", "DEXCHUS", "divide"),
        ("uk", "MYAGM2GBM189N", "DEXUSUK", "multiply"),
    ]
    for label, m2_id, fx_id, mode in regions:
        m2 = _to_monthly(fetch_fred_series_or_csv(m2_id, api_key, start=start))
        fx = _to_monthly(fetch_fred_series_or_csv(fx_id, api_key, start=start))
        usd = _convert_m2_to_usd(m2, fx, mode).rename(label)
        parts.append(usd)

    panel = pd.concat(parts, axis=1).sort_index().ffill()
    return panel.sum(axis=1).dropna()


def global_m2_yoy_on_index(
    api_key: str | None, index: pd.DatetimeIndex, start: str = "2010-01-01"
) -> pd.Series:
    """12-month YoY % on USD-converted global M2, forward-filled to `index`."""
    levels = build_global_m2_usd_billions(api_key, start=start)
    return m2_yoy_on_index(levels, index)


GLOBAL_M2_SOURCES = [
    "FRED M2SL (US)",
    "FRED MYAGM2EZM196N + DEXUSEU (Euro Area)",
    "FRED MYAGM2JPM189N + DEXJPUS (Japan)",
    "FRED MYAGM2CNM189N + DEXCHUS (China)",
    "FRED MYAGM2GBM189N + DEXUSUK (UK)",
]
