#!/usr/bin/env python3
"""Import the 1,000-event sample into an isolated, versioned SQLite source."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "doc" / "MIS_1000_Synthetic_Financial_Sample"
DEFAULT_SOURCE = SOURCE_DIR / "MIS_1000_Investment_Events.csv"
DEFAULT_DATABASE = ROOT / ".local" / "mis-financial-sample" / "reporting.sqlite"
MIGRATIONS = Path(__file__).resolve().parent / "migrations"
DEFAULT_MAPPING = Path(__file__).resolve().parent / "product-mapping.json"

EXPECTED_HEADERS = [
    "event_id", "event_date", "reporting_month", "region_id", "region", "ro_id", "ro_name",
    "customer_id", "customer_name", "product", "event_type", "transaction_amount_ngn",
    "calculation_base_ngn", "customer_rate_pct", "pool_rate_pct", "tenor_days", "maturity_date",
    "source_sample_row", "currency", "data_classification", "record_origin", "signed_movement_ngn",
    "new_external_inflow_ngn", "withdrawal_ngn", "maturity_outflow_ngn", "rollover_volume_ngn",
    "annual_customer_interest_ngn", "annual_pool_interest_ngn", "annual_interest_spread_ngn",
    "tenor_customer_interest_ngn", "tenor_pool_interest_ngn", "tenor_interest_margin_ngn",
    "estimated_maturity_value_ngn", "spread_pct_points",
]

CATALOG = [
    ("PROD-SESA-WITHOUT-TAX", "SESA without TAX", 1),
    ("PROD-SESA-WITH-TAX", "SESA with TAX", 2),
    ("PROD-SHYTA", "SHYTA", 3),
    ("PROD-SKET", "SKET", 4),
    ("PROD-SKIT", "SKIT", 5),
    ("PROD-SIRA", "SIRA", 6),
    ("PROD-SAMTL-REIT", "SAMTL REIT", 7),
]

FLOAT_COLUMNS = [
    "transaction_amount_ngn", "calculation_base_ngn", "customer_rate_pct", "pool_rate_pct",
    "signed_movement_ngn", "new_external_inflow_ngn", "withdrawal_ngn", "maturity_outflow_ngn",
    "rollover_volume_ngn", "annual_customer_interest_ngn", "annual_pool_interest_ngn",
    "annual_interest_spread_ngn", "tenor_customer_interest_ngn", "tenor_pool_interest_ngn",
    "tenor_interest_margin_ngn", "estimated_maturity_value_ngn", "spread_pct_points",
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def apply_migrations(connection: sqlite3.Connection) -> list[str]:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS financial_schema_migrations (
          version TEXT PRIMARY KEY,
          checksum TEXT NOT NULL,
          applied_at TEXT NOT NULL
        )
    """)
    applied: list[str] = []
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        sql = migration.read_text()
        checksum = hashlib.sha256(sql.encode()).hexdigest()
        existing = connection.execute(
            "SELECT checksum FROM financial_schema_migrations WHERE version = ?", (migration.name,)
        ).fetchone()
        if existing:
            if existing[0] != checksum:
                raise RuntimeError(f"Applied migration changed: {migration.name}")
            continue
        connection.executescript(sql)
        connection.execute(
            "INSERT INTO financial_schema_migrations(version, checksum, applied_at) VALUES (?, ?, ?)",
            (migration.name, checksum, now()),
        )
        applied.append(migration.name)
    return applied


def load_mapping(path: Path) -> dict:
    payload = json.loads(path.read_text())
    if not payload.get("mapping_version") or not isinstance(payload.get("mappings"), list):
        raise ValueError("Product mapping file is invalid.")
    known = {code: name for code, name, _ in CATALOG}
    seen: set[str] = set()
    for item in payload["mappings"]:
        source = item.get("source_product", "").strip()
        if not source or source in seen:
            raise ValueError("Each source product must have one mapping entry.")
        seen.add(source)
        status = item.get("status")
        if status not in {"MAPPED_DEMO", "UNMAPPED"}:
            raise ValueError(f"Unsupported mapping status for {source}.")
        code = item.get("target_product_code")
        name = item.get("target_product_name")
        if status == "MAPPED_DEMO" and known.get(code) != name:
            raise ValueError(f"Mapping for {source} is outside the SAMTL catalogue.")
        if status == "UNMAPPED" and (code or name):
            raise ValueError(f"Unmapped product {source} cannot have a target.")
    return payload


def parse_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != EXPECTED_HEADERS:
            raise ValueError("The financial event file does not match the isolated 34-column schema.")
        rows = list(reader)
    if not rows:
        raise ValueError("The financial event file is empty.")
    seen: set[str] = set()
    for line_number, row in enumerate(rows, start=2):
        event_id = row["event_id"].strip()
        if not event_id or event_id in seen:
            raise ValueError(f"Missing or duplicate event_id at source row {line_number}.")
        seen.add(event_id)
        if row["data_classification"] != "SYNTHETIC_DEMO_ONLY":
            raise ValueError(f"Unexpected data classification at source row {line_number}.")
        datetime.strptime(row["event_date"], "%Y-%m-%d")
        datetime.strptime(row["reporting_month"], "%Y-%m-%d")
        datetime.strptime(row["maturity_date"], "%Y-%m-%d")
        for column in FLOAT_COLUMNS:
            float(row[column])
        int(row["tenor_days"])
    return rows


def sync_configuration(connection: sqlite3.Connection, mapping: dict, cutoff: str, source_hash: str) -> None:
    connection.executemany(
        """INSERT INTO financial_product_catalog(product_code, product_name, display_order, is_active)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(product_code) DO UPDATE SET
             product_name=excluded.product_name, display_order=excluded.display_order, is_active=1""",
        CATALOG,
    )
    version = mapping["mapping_version"]
    connection.execute("DELETE FROM financial_product_mapping WHERE mapping_version = ?", (version,))
    connection.executemany(
        """INSERT INTO financial_product_mapping(
             mapping_version, source_product, target_product_code, target_product_name, mapping_status, mapping_note
           ) VALUES (?, ?, ?, ?, ?, ?)""",
        [(
            version,
            item["source_product"],
            item.get("target_product_code"),
            item.get("target_product_name"),
            item["status"],
            item["note"],
        ) for item in mapping["mappings"]],
    )
    connection.execute(
        """INSERT INTO financial_reporting_settings(
             settings_id, active_source_sha256, mapping_version, reporting_cutoff, day_count_basis,
             effective_date_included, wht_rate_pct, illustrative_opex_rate_pct,
             opening_balance_per_ro_product_ngn, annual_target_per_ro_ngn, rollover_treatment,
             daily_run_rate_basis, data_classification, updated_at
           ) VALUES (1, ?, ?, ?, 365, 0, 10.0, 2.0, 150000000.0, 1200000000.0,
             'ROLLOVER_REPORTED_SEPARATELY_NOT_ACTIVE_DEAL', 'CALENDAR_DAYS',
             'SYNTHETIC_DEMO_ONLY', ?)
           ON CONFLICT(settings_id) DO UPDATE SET
             active_source_sha256=excluded.active_source_sha256,
             mapping_version=excluded.mapping_version,
             reporting_cutoff=excluded.reporting_cutoff,
             day_count_basis=excluded.day_count_basis,
             effective_date_included=excluded.effective_date_included,
             wht_rate_pct=excluded.wht_rate_pct,
             illustrative_opex_rate_pct=excluded.illustrative_opex_rate_pct,
             opening_balance_per_ro_product_ngn=excluded.opening_balance_per_ro_product_ngn,
             annual_target_per_ro_ngn=excluded.annual_target_per_ro_ngn,
             rollover_treatment=excluded.rollover_treatment,
             daily_run_rate_basis=excluded.daily_run_rate_basis,
             data_classification=excluded.data_classification,
             updated_at=excluded.updated_at""",
        (source_hash, version, cutoff, now()),
    )


def import_rows(connection: sqlite3.Connection, path: Path, rows: list[dict[str, str]], source_hash: str, mapping: dict, cutoff: str) -> tuple[str, int, bool]:
    prior = connection.execute(
        "SELECT import_id, inserted_row_count FROM financial_import_runs WHERE source_sha256 = ? AND status = 'COMPLETED'",
        (source_hash,),
    ).fetchone()
    if prior:
        return prior[0], 0, True

    import_id = str(uuid.uuid4())
    started = now()
    connection.execute(
        """INSERT INTO financial_import_runs(
             import_id, source_file, source_sha256, mapping_version, reporting_cutoff,
             started_at, source_row_count, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING')""",
        (import_id, str(path.relative_to(ROOT)), source_hash, mapping["mapping_version"], cutoff, started, len(rows)),
    )
    columns = [
        "source_sha256", "event_id", "event_date", "reporting_month", "region_id", "region_name",
        "ro_id", "ro_name", "customer_id", "customer_name", "source_product", "event_type",
        "transaction_amount_ngn", "calculation_base_ngn", "customer_rate_pct", "pool_rate_pct",
        "tenor_days", "source_maturity_date", "source_sample_row", "currency", "data_classification",
        "record_origin", "signed_movement_ngn", "new_external_inflow_ngn", "withdrawal_ngn",
        "maturity_outflow_ngn", "rollover_volume_ngn", "source_annual_customer_interest_ngn",
        "source_annual_pool_interest_ngn", "source_annual_interest_spread_ngn",
        "source_tenor_customer_interest_ngn", "source_tenor_pool_interest_ngn",
        "source_tenor_interest_margin_ngn", "source_estimated_maturity_value_ngn",
        "source_spread_pct_points", "source_file", "source_row_number", "raw_source_json",
        "imported_at", "import_id",
    ]
    placeholders = ",".join("?" for _ in columns)
    statement = f"INSERT INTO financial_investment_events({','.join(columns)}) VALUES ({placeholders})"
    values = []
    for row_number, row in enumerate(rows, start=2):
        values.append((
            source_hash, row["event_id"], row["event_date"], row["reporting_month"], row["region_id"],
            row["region"], row["ro_id"], row["ro_name"], row["customer_id"], row["customer_name"],
            row["product"], row["event_type"], float(row["transaction_amount_ngn"]),
            float(row["calculation_base_ngn"]), float(row["customer_rate_pct"]),
            float(row["pool_rate_pct"]), int(row["tenor_days"]), row["maturity_date"],
            row["source_sample_row"] or None, row["currency"],
            row["data_classification"], row["record_origin"], float(row["signed_movement_ngn"]),
            float(row["new_external_inflow_ngn"]), float(row["withdrawal_ngn"]),
            float(row["maturity_outflow_ngn"]), float(row["rollover_volume_ngn"]),
            float(row["annual_customer_interest_ngn"]), float(row["annual_pool_interest_ngn"]),
            float(row["annual_interest_spread_ngn"]), float(row["tenor_customer_interest_ngn"]),
            float(row["tenor_pool_interest_ngn"]), float(row["tenor_interest_margin_ngn"]),
            float(row["estimated_maturity_value_ngn"]), float(row["spread_pct_points"]),
            str(path.relative_to(ROOT)), row_number, json.dumps(row, ensure_ascii=False, separators=(",", ":")),
            started, import_id,
        ))
    connection.executemany(statement, values)
    connection.execute(
        """UPDATE financial_import_runs
           SET completed_at = ?, inserted_row_count = ?, status = 'COMPLETED'
           WHERE import_id = ?""",
        (now(), len(values), import_id),
    )
    return import_id, len(values), False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--mapping", type=Path, default=DEFAULT_MAPPING)
    parser.add_argument("--cutoff", default="2026-10-10")
    args = parser.parse_args()
    datetime.strptime(args.cutoff, "%Y-%m-%d")
    source = args.source.resolve()
    database = args.database.resolve()
    mapping_path = args.mapping.resolve()
    rows = parse_rows(source)
    mapping = load_mapping(mapping_path)
    source_products = {row["product"] for row in rows}
    configured = {item["source_product"] for item in mapping["mappings"]}
    missing = sorted(source_products - configured)
    if missing:
        mapping["mappings"].extend({
            "source_product": product,
            "target_product_code": None,
            "target_product_name": None,
            "status": "UNMAPPED",
            "note": "No configured product mapping; source value preserved.",
        } for product in missing)
    unmapped = sorted({
        item["source_product"] for item in mapping["mappings"] if item["status"] == "UNMAPPED"
    })

    database.parent.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(source)
    connection = sqlite3.connect(database)
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        applied = apply_migrations(connection)
        with connection:
            import_id, inserted, skipped = import_rows(
                connection, source, rows, source_hash, mapping, args.cutoff
            )
            sync_configuration(connection, mapping, args.cutoff, source_hash)
        result = {
            "database": str(database.relative_to(ROOT)),
            "source": str(source.relative_to(ROOT)),
            "source_sha256": source_hash,
            "source_rows": len(rows),
            "inserted_rows_this_run": inserted,
            "active_source_rows": connection.execute(
                "SELECT COUNT(*) FROM financial_investment_events WHERE source_sha256 = ?", (source_hash,)
            ).fetchone()[0],
            "idempotent_skip": skipped,
            "import_id": import_id,
            "reporting_cutoff": args.cutoff,
            "mapping_version": mapping["mapping_version"],
            "configured_products": sorted(configured),
            "unmapped_products": unmapped,
            "migrations_applied": applied,
        }
        print(json.dumps(result, indent=2))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
