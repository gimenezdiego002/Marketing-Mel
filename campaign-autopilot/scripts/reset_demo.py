"""Regenerate and validate fixtures used by every repeatable demo run."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    subprocess.run([sys.executable, str(ROOT / "data" / "seed" / "generate_seed.py")], check=True, cwd=ROOT)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "seed_db.py"), "--dry-run"], check=True, cwd=ROOT)
    print("Demo reset complete: deterministic fixtures regenerated and workflow state will start clean.")


if __name__ == "__main__":
    main()
