"""
Bitcoin Liquidity Model — weekly OLS fair value from Fed net liquidity, M2, stablecoins.
Outputs data/btc-liquidity-model.json for the Additional Requests section.
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import yfinance as yf

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from fred_utils import fetch_fred_series, load_fred_api_key, m2_yoy_on_index  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "btc-liquidity-model.json"

START = "2015-01-01"
HALVINGS = [
    pd.Timestamp("2016-07-09"),
    pd.Timestamp("2020-05-11"),
    pd.Timestamp("2024-04-20"),
    pd.Timestamp("2028-04-20"),
]

METHODOLOGY = (
    "OLS regression of log(BTC) on Fed net liquidity ($T), global M2 YoY (%), "
    "stablecoin supply ($B), stablecoin 30-day change (%), halving-cycle position, "
    "and a time trend. Weekly data from Jan 2015. ±1σ / ±2σ bands in log space."
)


def halving_cycle_pos(date: pd.Timestamp) -> float:
    past = [h for h in HALVINGS if h <= date]
    if not past:
        return 0.0
    start = past[-1]
    future = next((h for h in HALVINGS if h > date), start + pd.Timedelta(days=4 * 365))
    span = max((future - start).days, 1)
    return float(min(max((date - start).days / span, 0.0), 1.0))


def fetch_stablecoin_supply() -> pd.Series:
    """USDT + USDC circulating USD from Defillama."""
    total = None
    for coin_id in (1, 2):  # USDT, USDC
        url = f"https://stablecoins.llama.fi/stablecoincharts/all?stablecoin={coin_id}"
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        rows = []
        for row in resp.json():
            ts = pd.Timestamp(row["date"], unit="s")
            val = row.get("totalCirculatingUSD", {}).get("peggedUSD")
            if val is not None:
                rows.append((ts, float(val)))
        s = pd.Series(dict(rows)).sort_index()
        total = s if total is None else total.add(s, fill_value=0)
    if total is None or total.empty:
        raise RuntimeError("No stablecoin data from Defillama")
    return total / 1e9  # billions


def fetch_btc_weekly() -> pd.Series:
    hist = yf.download("BTC-USD", start=START, interval="1d", progress=False, auto_adjust=True)
    if hist.empty:
        raise RuntimeError("No BTC data")
    close = hist["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    close.index = pd.to_datetime(close.index).tz_localize(None)
    return close.resample("W-FRI").last().dropna()


def build_weekly_panel(api_key: str) -> pd.DataFrame:
    walcl = fetch_fred_series("WALCL", api_key, start=START)  # millions USD
    tga = fetch_fred_series("WTREGEN", api_key, start=START)
    rrp = fetch_fred_series("RRPONTSYD", api_key, start=START)
    m2 = fetch_fred_series("M2SL", api_key, start=START)

    btc = fetch_btc_weekly()
    stables = fetch_stablecoin_supply()

    idx = btc.index
    walcl_w = walcl.reindex(idx, method="ffill")
    tga_w = tga.reindex(idx, method="ffill")
    rrp_w = rrp.reindex(idx, method="ffill")
    m2_w = m2.reindex(idx, method="ffill")
    stables_w = stables.reindex(idx, method="ffill")

    # WALCL & WTREGEN are millions USD; RRPONTSYD is billions USD
    fed_net_t = (walcl_w - tga_w - rrp_w * 1000) / 1e6  # trillions
    # 12-month YoY on monthly M2SL, forward-filled to weekly BTC dates (same as m2-yoy tile)
    m2_yoy = m2_yoy_on_index(m2, idx)
    stable_30d = stables_w.pct_change(4) * 100.0  # ~4 weeks

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


def fit_ols(df: pd.DataFrame) -> tuple[np.ndarray, float, float, float]:
    y = np.log(df["btc"].values)
    X = np.column_stack(
        [
            np.ones(len(df)),
            df["fed_net_t"].values,
            df["m2_yoy"].values,
            df["stable_b"].values,
            df["stable_30d"].values,
            df["halving"].values,
            df["weeks"].values,
        ]
    )
    beta, _, _, _ = np.linalg.lstsq(X, y, rcond=None)
    pred = X @ beta
    resid = y - pred
    sigma = float(np.std(resid, ddof=1))
    ss_res = float(np.sum(resid**2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    return beta, sigma, r2, float(len(df))


def signal_label(z: float) -> str:
    if z <= -1.5:
        return "Strong Cheap"
    if z >= 1.5:
        return "Strong Dear"
    if z < -0.5:
        return "Cheap"
    if z > 0.5:
        return "Dear"
    return "Fair"


def build_payload(df: pd.DataFrame, beta: np.ndarray, sigma: float, r2: float, n: float) -> dict:
    X = np.column_stack(
        [
            np.ones(len(df)),
            df["fed_net_t"].values,
            df["m2_yoy"].values,
            df["stable_b"].values,
            df["stable_30d"].values,
            df["halving"].values,
            df["weeks"].values,
        ]
    )
    log_pred = X @ beta
    log_actual = np.log(df["btc"].values)
    resid = log_actual - log_pred
    z = resid / sigma if sigma else resid * 0

    fair = np.exp(log_pred)
    band1_lo = np.exp(log_pred - sigma)
    band1_hi = np.exp(log_pred + sigma)
    band2_lo = np.exp(log_pred - 2 * sigma)
    band2_hi = np.exp(log_pred + 2 * sigma)

    points = []
    for i, (idx, row) in enumerate(df.iterrows()):
        points.append(
            {
                "date": idx.strftime("%Y-%m-%d"),
                "btcActual": round(float(row["btc"]), 2),
                "modelFair": round(float(fair[i]), 2),
                "band1Low": round(float(band1_lo[i]), 2),
                "band1High": round(float(band1_hi[i]), 2),
                "band2Low": round(float(band2_lo[i]), 2),
                "band2High": round(float(band2_hi[i]), 2),
                "zScore": round(float(z[i]), 2),
                "fedNetLiqT": round(float(row["fed_net_t"]), 2),
                "globalM2Yoy": round(float(row["m2_yoy"]), 2),
                "stableSupplyB": round(float(row["stable_b"]), 2),
            }
        )

    latest_i = -1
    btc_a = float(df["btc"].iloc[latest_i])
    fair_v = float(fair[latest_i])
    z_now = float(z[latest_i])
    vs_fair = (btc_a / fair_v - 1.0) * 100.0 if fair_v else 0.0

    coef_names = [
        "intercept",
        "fedNetLiqT",
        "globalM2Yoy",
        "stableSupplyB",
        "stable30dPct",
        "halvingCyclePos",
        "timeTrendWeeks",
    ]

    return {
        "slug": "btc-liquidity-model",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "btcActual": round(btc_a, 0),
            "fairValue": round(fair_v, 0),
            "rangeLow": round(float(band1_lo[latest_i]), 0),
            "rangeHigh": round(float(band1_hi[latest_i]), 0),
            "extremeLow": round(float(band2_lo[latest_i]), 0),
            "extremeHigh": round(float(band2_hi[latest_i]), 0),
            "signal": signal_label(z_now),
            "vsFairPct": round(vs_fair, 2),
            "zScore": round(z_now, 2),
        },
        "cards": {
            "fedNetLiqT": round(float(df["fed_net_t"].iloc[latest_i]), 1),
            "globalM2Yoy": round(float(df["m2_yoy"].iloc[latest_i]), 2),
            "stableSupplyB": round(float(df["stable_b"].iloc[latest_i]), 1),
            "stable30dPct": round(float(df["stable_30d"].iloc[latest_i]), 2),
        },
        "modelStats": {
            "r2": round(r2, 3),
            "observations": int(n),
            "residualSigma": round(sigma, 3),
        },
        "coefficients": [
            {"name": name, "value": round(float(beta[i]), 6)} for i, name in enumerate(coef_names)
        ],
        "methodology": METHODOLOGY,
        "sources": [
            "FRED WALCL, WTREGEN (millions USD), RRPONTSYD (billions USD), M2SL",
            "Defillama USDT + USDC",
            "Yahoo Finance BTC-USD",
        ],
        "points": points,
    }


def main() -> None:
    api_key = load_fred_api_key()
    print("Building weekly liquidity panel...")
    df = build_weekly_panel(api_key)
    print(f"  {len(df)} weeks")
    beta, sigma, r2, n = fit_ols(df)
    payload = build_payload(df, beta, sigma, r2, n)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} — BTC ${payload['headline']['btcActual']:,.0f}, z={payload['headline']['zScore']}")


if __name__ == "__main__":
    main()
