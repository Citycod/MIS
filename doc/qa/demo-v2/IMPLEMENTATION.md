# MIS v2.1 parallel development data mode

## Result

The corrected 300-event fixture is available through an optional, isolated server-side data mode. `phase2` remains the default. The existing Phase 2 JSON fixture, Superset 6.1.0 metadata database, reporting database, six dashboard registrations, UUIDs, roles, and RLS configuration were not changed.

## Repository adapter

`DemoV2PerformanceRepository` implements the existing `PerformanceRepository` contract and opens the configured SQLite file with `readOnly: true` plus `PRAGMA query_only = ON`. Every SQL query is parameterized and every repository call revalidates the signed principal, region, and exact RO scope against the active server catalog.

The adapter reads the four supplied reporting views. It does not reproduce Finance formulas in React or Next.js. Monthly run rate, profitability, WACC, product target allocation, and regional aggregate achievement remain unavailable. Customer and investment detail DTOs remain empty because the approved views do not contain the account and deal semantics required by those contracts.

## Reconciliation

- 300 events, 40 customers, 10 aliases, 3 regions, 12 ROs, 6 products, and 10 reporting months validated.
- CSV, XLSX, and SQLite records match field-for-field.
- 72 opening positions total NGN 3,960,000,000.00.
- Reporting views contain 720 product/month rows and 120 RO/month rows.
- Opening plus signed external movement reconciles to closing position.
- WACC, profitability, and approved monthly run rate remain `NULL`.

## Superset compatibility

Demo-v2 uses a separate read-only SQLite source named `MIS Demo-v2 Synthetic
Development`, four named reporting datasets, and six embedded dashboard UUIDs
stored only in `.local/superset/demo-v2-registry.json`. The original Phase 2
reporting source, six dashboard UUIDs, guest-token settings, roles and RLS
rules remain separate and unchanged.

The server-side guest-token broker selects the demo registry only in the
explicitly authorized development/test data mode. Its signed RLS clause binds
every chart query to `SYNTHETIC_DEMO_ONLY`, Region, the exact authorized RO set,
Date, Product, and MTD/YTD reporting range. Unsupported demo dates receive an
empty RLS clause (`1 = 0`), never a broader result. `PIS_SUPERSET_LOCAL_ENABLED`
is retained solely as the existing local compatibility identifier.

## Validation

- Package fixture validation: pass.
- Cross-format equality: pass.
- SQL reporting-view reconciliation: pass.
- Manifest verification: pass.
- TypeScript and focused ESLint: pass.
- Offline Webpack production build: pass.
- Focused default Phase 2 fixture and authorization regression: 2 passed.
- Demo-v2 SQL-view/filter test: passed.
- Demo-v2 RO/regional authorization and Superset isolation tests: passed.
- Data-mode default, invalid-mode, runtime authorization, and missing-path tests: 2 passed.

No dashboard layout or styling changed, so no replacement screenshots were created. The existing 14 design references in `doc/uiscreens/` and Phase 2 QA screenshots remain applicable.
