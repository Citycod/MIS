# 09 — Non-destructive integration into the existing MIS repository

## Local placement

```text
/home/uplix/MIS/
├── src/                         # Existing implemented Phase 1 & 2 app; do not replace
├── doc/
│   ├── mis/PIS_RO_Developer_Pack/  # Existing 27 baseline markdown docs (historic name)
│   ├── qa/phase2/                 # Existing six screenshots, tests, notes
│   └── urgent/
│       └── MIS_Urgent_Handoff_v2/
│           ├── README.md
│           ├── 01_SCOPE_AND_APPROVALS.md
│           ├── ...
│           ├── mis_300_synthetic_events.csv
│           ├── MIS_300_Synthetic_Demo_Data_v2.xlsx
│           ├── mis_demo_views.sql
│           ├── mis_synthetic_demo_v2.sqlite
│           └── scripts/
│               ├── validate_fixture.py
│               ├── test_reporting_views.py
│               └── ...
└── ...
```

Do not flatten folders or expect a `docs/` directory inside this urgent handoff. Keep `doc/mis/PIS_RO_Developer_Pack/` filenames for historical reference, but use **MIS** as current product title in new UI material.

## Data compatibility with Phase 2

The current Phase 2 screenshots and implementation notes used synthetic `RO-001` and `RO-002` and a 2026-09-30 snapshot; the **new v2** synthetic data uses `RO-LAG-01` through `RO-PH-04` and 2026-01 through October event history. **Do not hot-swap** these fixtures into the current mock repository. First add a parallel adapter or dashboard demo mode behind a dev-only flag, reconcile the DTO contracts, and demonstrate that prior filter/authorization tests still pass.

The bundled database uses the demo table/view names in `mis_demo_views.sql`; they are intentionally separate from the existing app's unknown production view names. Never invent bank view identifiers based on the demo schema.

## Suggested staged delivery only if approved

1. **Stage 0 (safe):** inspect current 6.1.0, SQLite, Next.js routes and tests; validate handoff QA; report requirements needing approval.
2. **Stage 1 (approved demo):** create a separate Superset database connection to `mis_synthetic_demo_v2.sqlite`, register demo-only view datasets and charts. Preserve existing datasets.
3. **Stage 2 (approved UI):** render the Superset charts with scope-correct filters on the existing dashboard templates; test independent RLS.
4. **Stage 3 (approved business feature):** CFO landing, view-mode selector, saved views, optional Product Analytics and themes behind clear feature flags, each with access tests.
5. **Production cutover (future):** DBA/Finance-approved SQL view mapping, production identity/role mapping, secure Superset embed, no use of synthetic fixture figures.

See `05_CODEX_REVIEW_PROMPT.md` for the immediate agent task. **At present this handoff only approves a review and plan, not stages 1–5.**

## UI references

Use the existing `doc/uiscreens/` folder (14 verified UI references) for layout, composition and density; apply MIS branding and updated Sterling-inspired theme tokens instead of copying historical blue colors. Screenshots do not override removal of Account Opening, Daily Performance or Product Performance scorecards.
