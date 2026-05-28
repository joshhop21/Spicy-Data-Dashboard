"""
Offline / partial fallback for Bitcoin Liquidity Model.

Uses real M2 from data/m2-yoy.json (same FRED series as Phase 2 tile),
real BTC from Yahoo, real stables from Defillama, and FRED for Fed net when available.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPTS = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from fetch_btc_liquidity_model import (  # noqa: E402
    START,
    build_payload,
    build_weekly_panel,
    fetch_btc_weekly,
    fetch_stablecoin_supply,
    fit_ols,
    halving_cycle_pos,
)
from fred_utils import fetch_fred_series_or_csv, load_fred_api_key  # noqa: E402

OUT = ROOT / "data" / "btc-liquidity-model.json"
M2_JSON = ROOT / "data" / "m2-yoy.json"


def load_m2_yoy_series() -> pd.Series:
    if not M2_JSON.exists():
        raise RuntimeError(f"Missing {M2_JSON} — run fetch_m2_yoy.py first")
    raw = json.loads(M2_JSON.read_text(encoding="utf-8"))
    return pd.Series(
        {pd.Timestamp(p["date"]): float(p["m2yoy"]) for p in raw["points"]},
        dtype=float,
    ).sort_index()


def load_m2_yoy_from_chart(weekly_index: pd.DatetimeIndex) -> pd.Series:
    """Reuse Phase 2 m2-yoy.json so headline numbers match that tile."""
    return load_m2_yoy_series().reindex(weekly_index, method="ffill")


def sync_m2_into_payload(payload: dict) -> dict:
    """Replace every weekly M2 point + card with Phase 2 m2-yoy.json values."""
    m2 = load_m2_yoy_series()
    for point in payload.get("points", []):
        ts = pd.Timestamp(point["date"])
        val = m2.asof(ts)
        if pd.notna(val):
            point["globalM2Yoy"] = round(float(val), 2)

    raw = json.loads(M2_JSON.read_text(encoding="utf-8"))
    headline_val = raw.get("headline", {}).get("value", "")
    try:
        target = float(str(headline_val).replace("%", "").strip())
        payload.setdefault("cards", {})["globalM2Yoy"] = round(target, 2)
        if payload.get("points"):
            payload["points"][-1]["globalM2Yoy"] = round(target, 2)
    except ValueError:
        pass

    payload["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return payload


def sync_m2_only() -> None:
    """Lightweight fix when live rebuild fails — still aligns M2 to Phase 2 tile."""
    if not OUT.exists():
        raise RuntimeError(f"Missing {OUT}")
    payload = json.loads(OUT.read_text(encoding="utf-8"))
    payload = sync_m2_into_payload(payload)
    payload["methodology"] = (
        "M2 YoY synced to Phase 2 m2-yoy.json (FRED M2SL, 12-month). "
        "Other series from last successful build — run fetch_btc_liquidity_model.py on GitHub Actions for full refresh."
    )
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Synced M2 only -> {OUT} - card M2 {payload['cards']['globalM2Yoy']}%")


def build_hybrid_panel(api_key: str | None) -> pd.DataFrame:
    btc = fetch_btc_weekly()
    stables = fetch_stablecoin_supply()
    idx = btc.index

    walcl = fetch_fred_series_or_csv("WALCL", api_key, start=START)
    tga = fetch_fred_series_or_csv("WTREGEN", api_key, start=START)
    rrp = fetch_fred_series_or_csv("RRPONTSYD", api_key, start=START)

    walcl_w = walcl.reindex(idx, method="ffill")
    tga_w = tga.reindex(idx, method="ffill")
    rrp_w = rrp.reindex(idx, method="ffill")
    stables_w = stables.reindex(idx, method="ffill")

    fed_net_t = (walcl_w - tga_w - rrp_w * 1000) / 1e6
    m2_yoy = load_m2_yoy_from_chart(idx)
    stable_30d = stables_w.pct_change(4) * 100.0

    t0 = idx[0]
    weeks = np.array([(d - t0).days / 7.0 for d in idx])
    halving = pd.Series([halving_cycle_pos(d) for d in idx], index=idx)

    df = pd.DataFrame(
        {
            "btc": btc,
            "fed_net_t": fed_net_t,
            "m2_yoy": m2_yoy,
            "stable_b": stables_w,
            "stable_30d": stable_30d,
            "halving": halving,
            "weeks": weeks,
        }
    ).dropna()
    return df


def main() -> None:
    api_key = None
    try:
        api_key = load_fred_api_key()
    except RuntimeError:
        print("  No FRED API key — using public FRED CSV + m2-yoy.json")

    try:
        if api_key:
            print("Trying full FRED fetch...")
            df = build_weekly_panel(api_key)
        else:
            raise RuntimeError("skip to hybrid")
        beta, sigma, r2, n = fit_ols(df)
        payload = build_payload(df, beta, sigma, r2, n)
        payload = sync_m2_into_payload(payload)
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(
            f"Wrote {OUT} (live) — M2 {payload['cards']['globalM2Yoy']}%, "
            f"BTC ${payload['headline']['btcActual']:,.0f}"
        )
        return
    except Exception as exc:
        print(f"  Full fetch unavailable ({exc}), using hybrid builder...")

    try:
        print("Building hybrid panel (M2 synced to m2-yoy.json)...")
        df = build_hybrid_panel(api_key)
        if len(df) < 60:
            raise RuntimeError("Not enough overlapping data for hybrid build")
        beta, sigma, r2, n = fit_ols(df)
        payload = build_payload(df, beta, sigma, r2, n)
        payload = sync_m2_into_payload(payload)
        payload["methodology"] = (
            "Hybrid build: M2 YoY synced to Phase 2 m2-yoy.json (FRED M2SL), "
            "BTC from Yahoo, stables from Defillama, Fed net from FRED. Weekly OLS fair-value model."
        )
        payload["sources"] = [
            "FRED WALCL, WTREGEN, RRPONTSYD, M2SL",
            "Phase 2 m2-yoy.json (M2 sync)",
            "Defillama USDT + USDC",
            "Yahoo Finance BTC-USD",
        ]
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(
            f"Wrote {OUT} (hybrid) — M2 {payload['cards']['globalM2Yoy']}%, "
            f"BTC ${payload['headline']['btcActual']:,.0f}"
        )
        return
    except Exception as exc:
        print(f"  Hybrid build failed ({exc}), syncing M2 only...")

    sync_m2_only()


if __name__ == "__main__":
    main()
