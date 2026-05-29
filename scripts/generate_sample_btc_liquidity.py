"""
Offline / partial fallback for Bitcoin Liquidity Model.

Uses global M2 (US+EA+JP+CN+UK) from FRED, real BTC from Yahoo,
real stables from Defillama, and FRED for Fed net when available.
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
from fred_utils import (  # noqa: E402
    GLOBAL_M2_SOURCES,
    fetch_fred_series_or_csv,
    global_m2_yoy_on_index,
    load_fred_api_key,
)

OUT = ROOT / "data" / "btc-liquidity-model.json"


def sync_global_m2_into_payload(payload: dict, api_key: str | None) -> dict:
    """Refresh global M2 series from FRED without full rebuild."""
    points = payload.get("points", [])
    if not points:
        return payload
    idx = pd.DatetimeIndex([pd.Timestamp(p["date"]) for p in points])
    m2_yoy = global_m2_yoy_on_index(api_key, idx, start=START)
    for point in points:
        ts = pd.Timestamp(point["date"])
        val = m2_yoy.get(ts)
        if val is not None and pd.notna(val):
            point["globalM2Yoy"] = round(float(val), 2)
    if points:
        payload.setdefault("cards", {})["globalM2Yoy"] = points[-1]["globalM2Yoy"]
    payload["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return payload


def sync_global_m2_only(api_key: str | None) -> None:
    if not OUT.exists():
        raise RuntimeError(f"Missing {OUT}")
    payload = json.loads(OUT.read_text(encoding="utf-8"))
    payload = sync_global_m2_into_payload(payload, api_key)
    payload["methodology"] = (
        "Global M2 YoY refreshed from FRED (US + EA + JP + CN + UK, USD-converted). "
        "Other series from last successful build."
    )
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Synced global M2 only -> {OUT} - card M2 {payload['cards']['globalM2Yoy']}%")


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
    m2_yoy = global_m2_yoy_on_index(api_key, idx, start=START)
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
        print("  No FRED API key — using public FRED CSV exports")

    try:
        if api_key:
            print("Trying full FRED fetch...")
            df = build_weekly_panel(api_key)
        else:
            raise RuntimeError("skip to hybrid")
        beta, sigma, r2, n = fit_ols(df)
        payload = build_payload(df, beta, sigma, r2, n)
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(
            f"Wrote {OUT} (live) — global M2 {payload['cards']['globalM2Yoy']}%, "
            f"BTC ${payload['headline']['btcActual']:,.0f}"
        )
        return
    except Exception as exc:
        print(f"  Full fetch unavailable ({exc}), using hybrid builder...")

    try:
        print("Building hybrid panel (global M2 from FRED)...")
        df = build_hybrid_panel(api_key)
        if len(df) < 60:
            raise RuntimeError("Not enough overlapping data for hybrid build")
        beta, sigma, r2, n = fit_ols(df)
        payload = build_payload(df, beta, sigma, r2, n)
        payload["methodology"] = (
            "Hybrid build: global M2 YoY (US + EA + JP + CN + UK, USD via FRED), "
            "BTC from Yahoo, stables from Defillama, Fed net from FRED."
        )
        payload["sources"] = [
            "FRED WALCL, WTREGEN, RRPONTSYD",
            *GLOBAL_M2_SOURCES,
            "Defillama USDT + USDC",
            "Yahoo Finance BTC-USD",
        ]
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(
            f"Wrote {OUT} (hybrid) — global M2 {payload['cards']['globalM2Yoy']}%, "
            f"BTC ${payload['headline']['btcActual']:,.0f}"
        )
        return
    except Exception as exc:
        print(f"  Hybrid build failed ({exc}), syncing global M2 only...")

    sync_global_m2_only(api_key)


if __name__ == "__main__":
    main()
