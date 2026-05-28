"""
Run all data fetchers (Phase 1 + Phase 2).
"""
import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "fetch_btc_hash_rate.py",
    "fetch_cdci.py",
    "fetch_inflation_70s.py",
    "fetch_berkshire_roe.py",
    "fetch_marty_distressed.py",
    "fetch_gold_fair_value.py",
    "fetch_hy_oas.py",
    "fetch_m2_yoy.py",
    "fetch_yield_2s10s.py",
    "fetch_private_credit_stress.py",
    "fetch_btc_liquidity_model.py",
]

PHASE2_SCRIPTS = {
    "fetch_hy_oas.py",
    "fetch_m2_yoy.py",
    "fetch_yield_2s10s.py",
    "fetch_private_credit_stress.py",
}

FALLBACKS = {
    "fetch_btc_hash_rate.py": "generate_sample_btc.py",
    "fetch_cdci.py": "generate_sample_cdci.py",
    "fetch_inflation_70s.py": "generate_sample_inflation_70s.py",
    "fetch_berkshire_roe.py": "generate_sample_berkshire_roe.py",
    "fetch_marty_distressed.py": "generate_sample_marty_distressed.py",
    "fetch_gold_fair_value.py": "generate_sample_gold_fair_value.py",
    "fetch_btc_liquidity_model.py": "generate_sample_btc_liquidity.py",
}


def main() -> None:
    root = Path(__file__).resolve().parent
    phase2_failed = False

    for name in SCRIPTS:
        path = root / name
        print(f"\n=== {name} ===")
        try:
            subprocess.check_call([sys.executable, str(path)])
        except subprocess.CalledProcessError:
            if name in PHASE2_SCRIPTS:
                phase2_failed = True
                print(f"  {name} failed (will use Phase 2 sample bundle if needed)")
            else:
                fallback = FALLBACKS.get(name)
                if fallback:
                    print(f"Falling back to {fallback}...")
                    subprocess.check_call([sys.executable, str(root / fallback)])
                else:
                    raise

    if phase2_failed:
        print("\n=== generate_sample_phase2.py (Phase 2 fallback) ===")
        subprocess.check_call([sys.executable, str(root / "generate_sample_phase2.py")])


if __name__ == "__main__":
    main()
