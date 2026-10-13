# MIS — Codex execution prompt (REVIEW FIRST; no automatic feature implementation)

You are joining an **existing** Management Information System (MIS) Next.js App Router repository at `/home/uplix/MIS`. Phase 1 and Phase 2 are already implemented. **Do not initialize a new app**, rewrite the completed dashboards, or migrate analytics infrastructure.

The attached self-contained v2.1 package should be located at `doc/urgent/MIS_Urgent_Handoff_v2/`, with all `.md`, `.csv`, `.xlsx`, `.sqlite`, `.sql`, `.env.example` and `scripts/*.py` files preserved in the supplied relative layout. Do not assume an additional `docs/` folder inside this handoff.

## Mandatory inspection

1. Review the 27 existing baseline specifications under `doc/mis/PIS_RO_Developer_Pack/` (these filenames predate the MIS branding correction), prioritizing 01 change control, 03 routes, 06 design, 07 architecture, 09 Superset, 11 security, 16 master prompt, 23 database architecture, 24 schema mapping and 26 self-hosted Superset setup.
2. Review the completed Phase 2 code, tests and six screenshots under `doc/qa/phase2/` if present, including `IMPLEMENTATION.md` and `CHANGED_FILES.md`.
3. Read **all documents in this handoff**, including `10_CORRECTIONS_AND_VALIDATION.md` and `11_EXISTING_SUPERSET_COMPATIBILITY.md`: `README.md`, `01_SCOPE_AND_APPROVALS.md`, `02_DATA_DICTIONARY_AND_AUDIT.md`, `03_EXISTING_SUPERSET_AND_SQLITE.md`, `04_CHARTS_FILTERS_AND_RLS.md`, `06_ACCEPTANCE_AND_VERIFICATION.md`, `07_DECISIONS_AND_DEPENDENCIES.md`, `08_BRAND_AND_THEME.md`, and `09_REPOSITORY_INTEGRATION_GUIDE.md`.
4. Inventory the **currently installed Apache Superset 6.1.0** and **read-only SQLite synthetic reporting views**. Record current dashboard UUIDs (not secrets), dataset names and file paths; do not change them. There must be **no Superset 6.0.0 install, PostgreSQL migration, or replacement of existing SQLite**.
5. Check the existing SDK wrapper, legacy `PIS_SUPERSET_LOCAL_ENABLED`, `.local/superset/registry.json`, six dashboard registrations, restricted guest-token broker and the documented resolution of the earlier HTTP 403. Do not reinstall Superset or replace existing chart registrations/RLS. Review all 14 layout reference images under `doc/uiscreens/` if present. Run existing lint, typecheck, build and Phase 2 acceptance tests before editing. Record results, do not claim passes without outputs.
6. Confirm the new 300-event demo bundle passes `python3 scripts/validate_fixture.py`, `python3 scripts/verify_cross_format.py`, and `python3 scripts/test_reporting_views.py --db mis_synthetic_demo_v2.sqlite`. The `.xlsx` and `.sqlite` are supplied; no automatic regeneration is required.

## Report before implementation

Provide a succinct **compatibility/decision review** with:

- Existing screen inventory and how latest requests differ from approved Phase 2.
- A clear **approved / pending owner decision / blocked by Finance or SSO** feature matrix for: CFO, Role View, RM region lock, shared dashboards, Product Analytics, saved filters, theme toggle and replacement fixture.
- Existing Superset/SQLite architecture and safest way to **add** a separate demo reporting source if approved.
- Whether the 300 synthetic events can be used without breaking existing RO-ID lookup and fixture contracts (note Phase 2 may use `RO-001`, while demo uses `RO-LAG-01`).
- Database-view reconciliation risks and the no-frontend-finance-formulas rule.
- A minimal implementation plan with stages, test gates and rollback. **Stop and request approval** before undertaking new user-role access or dashboard scope changes.

## Allowed immediately (non-destructive)

- Read-only analysis of existing code / Superset setup.
- QA of demo CSV/XLSX/SQLite and source lineage.
- Documentation of current-vs-proposed chart names and filter contracts.
- Creation of **new isolated** test artifacts without modifying app routes, SSO, database connections or existing fixture files.

## Only after separate explicit approval

- CFO role or new server-side scope expansion.
- User-editable Role View and saved/bookmarked filters.
- Consolidating routes/screens or enabling Product Analytics.
- Light/dark themes, especially Superset-embed theme policy.
- Replacing Phase 2 mock data or connecting new Superset UUIDs.

## Non-negotiables

- Product label is **Management Information System (MIS)**. Historical `PIS_*` spec filenames may remain to avoid breaking references; do not globally rename code automatically.
- Preserve the boss's prior exclusions: no Account Opening, Daily Performance or Recent Activity, no removed status/ranking scoreboards and no CRM write operations.
- Existing CRM tables/DBA-approved views are authoritative; all production financial calculations live in **approved SQL views**, not TypeScript or Superset ad hoc formulas.
- The bundled SQLite views and synthetic data are **unapproved illustrative fixtures** only.
- Never assume RO Role View can escalate privileges; regional filter remains locked for an RM unless explicitly approved otherwise.

**Deliverable for this prompt:** a reviewed integration and approval plan, with QA evidence. Do **not** start implementation without the owner's authorization.
