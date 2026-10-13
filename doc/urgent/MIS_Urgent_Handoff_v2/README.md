# MIS — corrected urgent handoff (v2.1 verification patch, 12 October 2026)

**Product:** Management Information System (MIS). **Purpose:** safe, self-contained **review-and-integration** handoff for an existing Next.js App Router MIS repository. This package **does not authorize scope changes** or a production cutover.

## Start here

The previous handoff was unsuitable because it used the wrong product name, referenced absent files, generated poor source lineage, and recommended installing Superset 6.0.0 with PostgreSQL despite your existing **Superset 6.1.0 and read-only SQLite synthetic reporting environment**. The present package corrects those conflicts. The v2.1 patch also repairs the stale starting-position CSV and independently audits CSV, XLSX and SQLite equality. It **does not upgrade, replace, install, migrate, or reconfigure** your already-running Superset or production CRM.

1. Copy the **whole extracted directory** to `doc/urgent/MIS_Urgent_Handoff_v2/` (do **not** flatten its `scripts/` folder). Every file named in the instructions is present in the ZIP.
2. Read `10_CORRECTIONS_AND_VALIDATION.md` and `01_SCOPE_AND_APPROVALS.md` and obtain explicit approval before changing dashboard or role permissions.
3. Run `python3 scripts/validate_fixture.py`, `python3 scripts/verify_cross_format.py`, and `python3 scripts/test_reporting_views.py --db mis_synthetic_demo_v2.sqlite` within the extracted directory. **All three must pass.** These scripts use only synthetic fixture files and the bundled demo SQLite file.
4. Inspect the existing Superset and SQLite setup *read-only*; see `03_EXISTING_SUPERSET_AND_SQLITE.md` and `scripts/audit_existing_sqlite.py`.
5. If a separate demo dataset is needed, **stage** `mis_synthetic_demo_v2.sqlite` as an additional, isolated read-only reporting source. Never replace an existing database or its SQLite reporting views.
6. Give Codex `05_CODEX_REVIEW_PROMPT.md`. It explicitly requests a plan/diff and stops before approval-gated feature implementation.

## Supplied files (self-contained)

| File | Purpose |
|---|---|
| `README.md` | This index and safe start sequence |
| `01_SCOPE_AND_APPROVALS.md` | Existing baseline vs proposed CFO, Role View, consolidation, saved views, themes |
| `02_DATA_DICTIONARY_AND_AUDIT.md` | Source alias lineage, 300-row quality results, known limitations |
| `03_EXISTING_SUPERSET_AND_SQLITE.md` | Superset 6.1.0 / SQLite coexistence and staging instructions |
| `04_CHARTS_FILTERS_AND_RLS.md` | Chart catalog, period semantics, filter synchronization and RBAC |
| `05_CODEX_REVIEW_PROMPT.md` | Copy/paste next action for Codex; review first, do not immediately implement |
| `06_ACCEPTANCE_AND_VERIFICATION.md` | Acceptance checklist, commands, rollback strategy |
| `07_DECISIONS_AND_DEPENDENCIES.md` | Stakeholder questions and technical prerequisites |
| `08_BRAND_AND_THEME.md` | Sterling-inspired light and dark token proposal |
| `09_REPOSITORY_INTEGRATION_GUIDE.md` | Reconcile existing 27-document baseline and Phase 2 code |
| `mis_300_synthetic_events.csv` | Exactly 300 DEMO event records, Jan–Oct 2026 |
| `mis_synthetic_ro_targets.csv` | 12 unapproved demo annual targets |
| `mis_synthetic_starting_positions.csv` | 72 unapproved demo opening snapshots |
| `source_aliases.csv` | 10 aliases with actual source CSV row numbers |
| `source_reference/Original_10_Row_Sample.csv` | User-uploaded 2025 sample for provenance review only; not imported into demo views |
| `MIS_300_Synthetic_Demo_Data_v2.xlsx` | Same fixture in a reviewable workbook with Read Me sheet |
| `mis_demo_views.sql` | **Demo-only** reporting view definitions for isolated SQLite |
| `mis_synthetic_demo_v2.sqlite` | Prebuilt **isolated** demo DB, not a copy of CRM or Superset metadata |
| `scripts/generate_fixture.py` | Reproducibly regenerate synthetic CSVs |
| `scripts/validate_fixture.py` | Verify dataset, aliases, structure |
| `scripts/build_isolated_sqlite.py` | Build a **new** isolated demo DB; refuses to overwrite |
| `scripts/audit_existing_sqlite.py` | Read-only schema inventory for a separately supplied SQLite file |
| `scripts/test_reporting_views.py` | Reconciliation tests for an explicitly selected isolated SQLite DB (`--db`) |
| `scripts/verify_cross_format.py` | CSV ↔ XLSX ↔ SQLite row-by-row reconciliation for all fields; fails on the original 72-row defect |
| `10_CORRECTIONS_AND_VALIDATION.md` | Defect resolution and proof/limitations |
| `11_EXISTING_SUPERSET_COMPATIBILITY.md` | Existing Superset 6.1.0 SDK/token, legacy env and registry handoff; not a deployment/export |
| `.env.example` | Non-secret development environment variable template |

## Authority and precedence

- **Implemented baseline:** existing Next.js app and completed Phase 2 dashboards. Do not replace with this demo.
- **Approved previous business scope:** RO + Regional Manager dashboards, monthly portfolio movement, top Region/RO/Date/Product filters, MTD/YTD investment-mix donut, no Account Opening or Daily Performance screens.
- **Proposed (awaiting explicit approval):** CFO view, RO-editable Role View selector, consolidation to fewer dashboards, standalone Product Analytics dashboard, saved/bookmarked filter views, and dark/light mode.
- **Data ownership:** existing CRM operational tables; financial calculations and targets from DBA/Finance-approved views. Current SQLite SQL is illustration **only** and must not be promoted as approved financial policy.

## Safety

No database credentials or live CRM connection are included. The original user-provided sample CSV is supplied for private provenance review and may contain unverified or sensitive labels; do not publish this pack to a public repository. All `mis_*` CSV, workbook and SQLite data is tagged `SYNTHETIC_DEMO_ONLY`. Product labels **Shyta** and **Sira** are provisional until corrected product master data is supplied. Financial metric gaps must be shown as **Pending Finance Definition**, not backfilled with invented values. Do not make Next.js or Superset the authoritative finance calculation engine.
