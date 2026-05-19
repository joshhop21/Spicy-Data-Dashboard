"""
Run all data fetchers. Add new scripts here as Phase 1 charts come online.
"""
import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "fetch_btc_hash_rate.py",
    # "fetch_cdci.py",
    # "fetch_inflation_70s.py",
]


def main() -> None:
    root = Path(__file__).resolve().parent
    for name in SCRIPTS:
        path = root / name
        print(f"\n=== {name} ===")
        try:
            subprocess.check_call([sys.executable, str(path)])
        except subprocess.CalledProcessError:
            if name == "fetch_btc_hash_rate.py":
                print("Falling back to sample BTC data...")
                subprocess.check_call([sys.executable, str(root / "generate_sample_btc.py")])
            else:
                raise


if __name__ == "__main__":
    main()
