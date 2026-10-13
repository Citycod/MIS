# MIS urgent package v2.1 — corrections and verification

**Status:** synthetic-data cross-format defect corrected; this does **not** approve production integration, CFO scope changes, Superset RLS, chart provisioning, new dashboards or Finance calculations.

## Corrected blocking defect

The previously distributed `mis_synthetic_starting_positions.csv` contained 72 × NGN 150,000,000 = **NGN 10,800,000,000**. That was stale and disagreed with the generator, workbook and bundled demo SQLite.

The v2.1 CSV now has **72 variable synthetic positions, NGN 40m–70m each, totaling NGN 3,960,000,000**, matching the generator, workbook and SQLite **row-for-row** (matching RO ID and product). These are invented demo openings; no basis for treating them as verified banking balances.

## New offline test contract

```bash
cd /home/uplix/MIS/doc/urgent/MIS_Urgent_Handoff_v2
python3 scripts/validate_fixture.py
python3 scripts/verify_cross_format.py --db mis_synthetic_demo_v2.sqlite
python3 scripts/test_reporting_views.py --db mis_synthetic_demo_v2.sqlite
```

`verify_cross_format.py` uses standard-library OOXML parsing and checks **every column and each business-keyed row** for events, positions, RO targets (CSV ⇄ workbook ⇄ SQLite) plus aliases (CSV ⇄ workbook); compares opening totals and rejects constant values. Does not require optional Python packages. The old validator remains an additional structural/lineage test.

`test_reporting_views.py` now accepts `--db /path/to/selected-demo.sqlite` and tests **that exact file** read-only, requiring demo-only table names. It no longer silently checks the bundled file when a separate database is supplied.

## Other fixes

- All handoff directory references use the **case-sensitive** `doc/urgent/MIS_Urgent_Handoff_v2` path.
- `doc/uiscreens/` is explicitly a set of **layout references**, not current scope requirements or bank-approved brand artwork.
- `.env.example` notes existing application setting `PIS_SUPERSET_LOCAL_ENABLED` and `.local/superset/registry.json` as **legacy compatibility names**; verify the actual code and configuration on the developer machine.
- Handoff recognizes that the Superset SDK wrapper already embeds when filters exist. The previous 403 was traced to the earlier origin check and missing `CurrentUserRestApi` read permission; the current restricted guest-token flow returns HTTP 200 without broadening roles.
- **No** Superset dashboards/charts/RLS export or provisioning are included. Existing Superset 6.1.0 and read-only SQLite are preserved.

## Verification boundary

The local Next.js broker, Superset 6.1.0 installation, non-secret dashboard registry, restricted roles, guest-token issuance, `/api/v1/me/roles/`, and embedded dashboard route were verified in the MIS development repository on 12 October 2026. Production SSO, CRM view schemas, Finance definitions, deployment settings and institutional authorization remain unverified dependencies; local proof is not deployment approval.
