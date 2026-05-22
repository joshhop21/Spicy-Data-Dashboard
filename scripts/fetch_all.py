"""
Run all data fetchers. Add new scripts here as Phase 1 charts come online.
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
]


def main() -> None:
    root = Path(__file__).resolve().parent
    for name in SCRIPTS:
        path = root / name
        print(f"\n=== {name} ===")
        try:
            subprocess.check_call([sys.executable, str(path)])
        except subprocess.CalledProcessError:
            fallbacks = {
                "fetch_btc_hash_rate.py": "generate_sample_btc.py",
                "fetch_cdci.py": "generate_sample_cdci.py",
                "fetch_inflation_70s.py": "generate_sample_inflation_70s.py",
                "fetch_berkshire_roe.py": "generate_sample_berkshire_roe.py",
                "fetch_marty_distressed.py": "generate_sample_marty_distressed.py",
                "fetch_gold_fair_value.py": "generate_sample_gold_fair_value.py",
            }
            fallback = fallbacks.get(name)
            if fallback:
                print(f"Falling back to sample data ({fallback})...")
                subprocess.check_call([sys.executable, str(root / fallback)])
            else:
                raise


if __name__ == "__main__":
    main()
