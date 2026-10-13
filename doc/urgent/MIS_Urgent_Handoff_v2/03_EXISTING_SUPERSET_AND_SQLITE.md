# 03 — Keep existing Superset 6.1.0 and SQLite

**Current environment (verified in the MIS repository on 12 October 2026):** self-hosted **Apache Superset 6.1.0**, a separate **read-only SQLite synthetic reporting source**, six registered embedded dashboards, and a working Next.js Phase 2 codebase. This handoff does *not* imply new installation, upgraded Superset, PostgreSQL, or database migrations.

## Safe discovery — do first

1. In the existing MIS repository, list current Superset setup scripts, configured SQLite file path, dashboard UUIDs, dataset names, embed settings and version. **Do not expose passwords/tokens in reports.**
2. Confirm whether the SQLite path refers to Superset's **metadata** database or to the **separate synthetic reporting** database. Never attach reporting views to, or modify, Superset metadata SQLite.
3. For a safely accessible file use `python3 scripts/audit_existing_sqlite.py /absolute/path/to/existing-reporting.sqlite`, a **read-only** listing of table/view names.
4. Confirm current Superset service health and dataset access. Avoid deleting/replacing any existing database or dataset.
5. Ask who approves extending the synthetic reporting source. Prefer a **second isolated read-only source** to changing the currently working one.

## The demo SQLite already supplied

- `mis_synthetic_demo_v2.sqlite`: NEW isolated SQLite file containing 300 synthetic events, 72 starting snapshots, 12 targets and four demo reporting views. It contains **no production customer data**.
- `mis_demo_views.sql`: definitions for `v_demo_events`, `v_demo_monthly_ro_product_movement`, `v_demo_monthly_ro_position`, `v_demo_investment_mix`.
- `scripts/build_isolated_sqlite.py` will only create a **non-existing** `.sqlite` file; existing files cause a hard error. The supplied DB is already built. To build a separate copy:

```bash
python3 scripts/build_isolated_sqlite.py --output /tmp/mis_synthetic_test_copy.sqlite
python3 scripts/audit_existing_sqlite.py /tmp/mis_synthetic_test_copy.sqlite
python3 scripts/test_reporting_views.py --db /tmp/mis_synthetic_test_copy.sqlite
python3 scripts/verify_cross_format.py --db /tmp/mis_synthetic_test_copy.sqlite
```

Choose a new pathname that does not exist. Do not run or import `mis_demo_views.sql` against a CRM or live reporting schema.

## Attaching to Superset, only in isolated demo mode

1. Obtain developer approval and access to the installed Superset **6.1.0** UI.
2. Ensure the Superset server process can access a copy of the *separate demo* SQLite file through its filesystem or container volume. For containerized Superset, the **container path**, not host path, must be used. Set the file **read-only** and protect its directory.
3. In Superset, add a **new** read-only database connection to the demo file using the installed SQLAlchemy SQLite driver/configuration supported by this instance. Do not alter existing connection strings or metadata DB settings.
4. Register datasets for the `v_demo_*` views, mark them clearly `MIS DEMO / SYNTHETIC` and restrict access to demo testers.
5. Build isolated demo charts described in `04_CHARTS_FILTERS_AND_RLS.md` and use **new** demo dashboard UUIDs. Retain the existing working dashboard UUIDs untouched.
6. If embeddings will be tested, verify instance-specific allowed domains, supported guest-token flow, session/CSRF settings, and **Superset row-level security**. Do not assume frontend filters are authorization controls.
7. Existing `src/components/superset/superset-dashboard-placeholder.tsx` **already calls the embedded SDK when filters exist**. Do not rebuild the wrapper or describe this as a static-placeholder replacement. The previous HTTP 403 was traced to the earlier origin check and a missing `can_read` permission on `CurrentUserRestApi`; both corrections are present. Preserve the existing guest-token/RLS configuration and dashboard registrations.

## Production database view integration

In production, **Next.js server-side read-only SQL** and **Superset's independent read-only account** will access DBA/Finance-approved views. Superset must never query the bank's CRM as a browser client, and the user-facing Next.js code must never expose database secrets. Current SQLite demo views are not substitutes for approved production views.

## Environment sample

See `.env.example` for placeholders only. Never commit real database or Superset secrets. Keep the existing working `.env.local` untouched.

## Existing integration compatibility

Review `11_EXISTING_SUPERSET_COMPATIBILITY.md`. Existing application code reads `PIS_SUPERSET_LOCAL_ENABLED` and `.local/superset/registry.json`; these legacy internal identifiers remain for compatibility. This package does not supply replacement Superset chart/dashboard export JSON, RLS provisioning or automated chart creation.
