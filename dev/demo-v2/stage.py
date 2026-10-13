#!/usr/bin/env python3
"""Stage the verified MIS v2.1 SQLite database without overwriting any file."""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "doc" / "urgent" / "MIS_Urgent_Handoff_v2"
SOURCE = PACKAGE / "mis_synthetic_demo_v2.sqlite"
DEFAULT_TARGET = ROOT / ".local" / "mis-demo-v2" / "reporting.sqlite"


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def verify_database(path: Path) -> None:
    connection = sqlite3.connect(f"file:{path.resolve().as_posix()}?mode=ro", uri=True)
    connection.execute("PRAGMA query_only=ON")
    try:
        assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        expected = {
            "demo_investment_events": 300,
            "demo_starting_positions": 72,
            "demo_ro_targets": 12,
            "v_demo_monthly_ro_product_movement": 720,
            "v_demo_monthly_ro_position": 120,
        }
        for relation, rows in expected.items():
            actual = connection.execute(f"SELECT COUNT(*) FROM {relation}").fetchone()[0]
            assert actual == rows, f"{relation}: expected {rows}, found {actual}"
        classifications = connection.execute(
            "SELECT DISTINCT data_classification FROM v_demo_events"
        ).fetchall()
        assert classifications == [("SYNTHETIC_DEMO_ONLY",)]
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage the isolated MIS v2.1 development database")
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()
    target = args.target.resolve()
    if target.exists():
        raise SystemExit(f"Refusing to overwrite existing database: {target}")
    manifest_line = next(
        line for line in (PACKAGE / "MANIFEST.sha256").read_text().splitlines()
        if line.endswith("  mis_synthetic_demo_v2.sqlite")
    )
    expected_hash = manifest_line.split()[0]
    actual_hash = digest(SOURCE)
    if actual_hash != expected_hash:
        raise SystemExit("Bundled database does not match MANIFEST.sha256")
    verify_database(SOURCE)
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    shutil.copyfile(SOURCE, target)
    os.chmod(target, 0o444)
    verify_database(target)
    print(f"PASS: staged verified synthetic demo database at {target}")


if __name__ == "__main__":
    main()
