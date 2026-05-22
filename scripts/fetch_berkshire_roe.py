"""
Berkshire Rolling 10yr ROE tile — rolling 10-year % change in book value per share (BVPS).
Primary: reported annual BVPS (1982–2024). Fallback: Yahoo Finance quarterly BRK-B.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from berkshire_bvps_annual import ANNUAL_BVPS  # noqa: E402

OUT = ROOT / "data" / "berkshire-roe.json"

TICKER = "BRK-B"
ROLLING_YEARS = 10
REFERENCE_LINE = 20.0


def annual_bvps_series() -> pd.Series:
    series = pd.Series(ANNUAL_BVPS)
    series.index = pd.to_datetime([f"{y}-12-31" for y in series.index])
    return series.sort_index()


def annual_to_monthly(annual: pd.Series) -> pd.Series:
    monthly_idx = pd.date_range(annual.index[0], annual.index[-1], freq="ME")
    return annual.reindex(monthly_idx, method="ffill")


def rolling_ten_year_cagr(values: pd.Series) -> pd.Series:
    """Annualized % change in BVPS over trailing 10 years."""
    periods = ROLLING_YEARS * 12
    ratio = values / values.shift(periods)
    return (ratio.pow(1.0 / ROLLING_YEARS) - 1.0) * 100.0


def _pick_row(frame: pd.DataFrame, candidates: list[str]) -> pd.Series:
    for name in candidates:
        if name in frame.index:
            return frame.loc[name]
    raise KeyError(f"None of {candidates} found")


def fetch_bvps_yahoo(ticker: str = TICKER) -> pd.Series:
    stock = yf.Ticker(ticker)
    bs = stock.quarterly_balance_sheet
    inc = stock.quarterly_income_stmt
    if bs.empty or inc.empty:
        raise RuntimeError(f"No quarterly fundamentals for {ticker}")

    equity = _pick_row(
        bs,
        [
            "Stockholders Equity",
            "Total Stockholder Equity",
            "Total Equity Gross Minority Interest",
            "Common Stock Equity",
        ],
    )
    shares = _pick_row(
        inc,
        ["Ordinary Shares Number", "Diluted Average Shares", "Basic Average Shares", "Share Issued"],
    )
    common = equity.index.intersection(shares.index)
    bvps = (equity[common].astype(float) / shares[common].astype(float)).dropna()
    bvps.index = pd.to_datetime(bvps.index).tz_localize(None)
    return bvps.sort_index()


def build_payload(roe: pd.Series) -> dict:
    roe = roe.dropna().tail(500)
    points = [
        {"date": idx.strftime("%Y-%m-%d"), "roe": round(float(val), 2)}
        for idx, val in roe.items()
    ]

    latest = roe.iloc[-1]
    prev = roe.iloc[-2] if len(roe) > 1 else latest
    delta = float(latest - prev)

    return {
        "slug": "berkshire-roe",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "headline": {
            "value": f"{latest:.1f}%",
            "delta": f"{delta:+.1f}%",
            "deltaDate": roe.index[-1].strftime("%b %y"),
            "deltaPositive": bool(delta >= 0),
        },
        "series": [
            {
                "key": "roe",
                "label": "Rolling 10y ROE",
                "color": "#b8860b",
                "type": "area",
            }
        ],
        "points": points,
        "referenceLine": {"value": REFERENCE_LINE, "label": "20%"},
        "thesis": (
            "Berkshire's rolling 10-year change in book value per share summarizes how fast "
            "intrinsic value has compounded. Sustained readings above 20% reflect exceptional "
            "long-run capital allocation."
        ),
        "methodology": (
            "BVPS from Berkshire Hathaway reported year-end book value per Class A equivalent share "
            f"({min(ANNUAL_BVPS.keys())}–{max(ANNUAL_BVPS.keys())}). "
            f"Displayed metric: trailing {ROLLING_YEARS}-year CAGR of BVPS on a monthly timeline."
        ),
        "sources": [
            "Berkshire Hathaway annual reports (book value per share)",
            f"Yahoo Finance ({TICKER}) optional refresh for recent quarters",
        ],
    }


def main() -> None:
    print("Building Berkshire rolling 10y BVPS change from annual reports...")
    annual = annual_bvps_series()
    monthly_bvps = annual_to_monthly(annual)
    roe = rolling_ten_year_cagr(monthly_bvps)

    # Optionally blend latest Yahoo quarter if available
    try:
        time.sleep(1)
        yahoo_bvps = fetch_bvps_yahoo()
        yahoo_monthly = yahoo_bvps.resample("ME").last().ffill()
        combined = monthly_bvps.combine_first(yahoo_monthly)
        roe = rolling_ten_year_cagr(combined)
        print("Blended latest Yahoo quarterly BVPS into series.")
    except Exception as exc:  # noqa: BLE001
        print(f"Yahoo blend skipped ({exc})")

    payload = build_payload(roe)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(payload['points'])} points)")


if __name__ == "__main__":
    main()
