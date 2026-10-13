# MIS demo-v2 data mode

This optional development mode reads the corrected 300-event v2.1 fixture from a separate, read-only SQLite database. It does not alter the default Phase 2 snapshots, reporting database, dashboard UUIDs, or existing registrations.

Stage the database once. The script verifies the package manifest, integrity, classifications, row counts, and reporting views, and refuses to overwrite an existing target.

```bash
python3 dev/demo-v2/stage.py
```

Run the application against the isolated database:

```bash
MIS_DATA_MODE=demo-v2 \
MIS_DEMO_V2_ALLOWED=true \
MIS_DEMO_V2_RUNTIME=development \
MIS_DEMO_V2_SQLITE_PATH="$PWD/.local/mis-demo-v2/reporting.sqlite" \
pnpm dev
```

`MIS_DATA_MODE` defaults to `phase2`. Unknown values fail closed. `demo-v2` also fails unless its allow flag, runtime classification, and database path are supplied server-side. Browser parameters, cookies, and local storage cannot select the data source.

The adapter reads only `v_demo_monthly_ro_position`, `v_demo_monthly_ro_product_movement`, `v_demo_events`, and `v_demo_investment_mix`. Targets are shown only at the all-product grain. Monthly run rate, profitability, WACC, and product target allocations stay unavailable. Customer and investment detail pages return empty lists because the approved demo views do not supply their required account and deal semantics.

## Optional local Superset charts

The existing Superset 6.1.0 installation can register demo-v2 as a separate
read-only source with four separately named datasets and six separately named
embedded dashboards. This command adds resources only; it does not update the
Phase 2 dashboards, UUIDs, database, roles, or existing RLS rules.

```bash
bash dev/superset/provision_demo_v2.sh
```

Then run Superset and the demo application in separate terminals:

```bash
bash dev/superset/run.sh
```

```bash
MIS_DATA_MODE=demo-v2 \
MIS_DEMO_V2_ALLOWED=true \
MIS_DEMO_V2_RUNTIME=development \
MIS_DEMO_V2_SQLITE_PATH="$PWD/.local/mis-demo-v2/reporting.sqlite" \
PIS_SUPERSET_LOCAL_ENABLED=true \
pnpm dev --webpack --hostname 127.0.0.1 --port 3200
```

`PIS_SUPERSET_LOCAL_ENABLED` is a legacy internal compatibility identifier. It
enables the local broker only; no PIS product name is shown in the MIS UI. A
token is bound server-side to its Region, authorized RO set, date, product and
MTD/YTD state through Superset guest-token RLS. The charts and every source row
are labelled synthetic development data.

The current development persona IDs are mapped in a separate catalog to the 12 v2.1 RO identifiers and three regional scopes. This mapping exists only while the explicitly enabled demo-v2 mode is active; the Phase 2 catalog remains the default.
