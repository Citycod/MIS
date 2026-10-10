# PIS — Relationship Officer + Regional Manager Developer Pack

**Version:** 1.4 — direct CRM database + approved SQL views + self-hosted Apache Superset (10 October 2026)  
**Framework:** Next.js App Router + strict TypeScript  
**Status:** Implementation specification; some finance and database contracts still require owner sign-off.

## Authoritative precedence

1. **Latest boss/project-owner decisions from 10 October 2026**, including direct CRM database access and calculations in database SQL views.
2. Boss's dashboard/UI revision (monthly portfolio movement, RO and regional scope, global filters, removed features).
3. User-confirmed Next.js App Router and Sterling-inspired red/charcoal/white styling.
4. Original 15-page RO Performance & Profitability business document; where superseded by boss, explicitly mark supersession.
5. Earlier generated blue UI mockups: **composition references only**, not functional or palette authority.

**The 09 October CRM API + separate KPI microservice architecture is obsolete and must not be implemented.** Existing CRM database tables provide operational records. Finance/DBA-approved SQL views inside the existing database (or approved reporting replica with identical authoritative definitions) calculate all financial KPIs. Next.js queries through a secure **server-only read-only DB adapter**; Superset connects with its own read-only view-restricted DB account.

## Scope snapshot

- **RO:** Own My Performance, monthly movement, portfolio/customer/deal lists and details, targets/run rate, approved profitability, maturity/rollover and reports.
- **Regional Manager:** Compare and filter **all and only** Relationship Officers in authorized region(s); regional trends and RO drilldowns.
- **Four common top filters:** Region, RO, Date and Product across all boards (locked RO scope for individual officer).
- **Monthly:** Month-grain charts and ledger; MTD/YTD investment donut = **investment product composition, not product performance**.
- **Excluded:** Account Opening (including accounts opened Today/MTD/YTD), Daily Performance dashboard, Recent Activity chart/feed, standalone Product Performance page/scoreboard, RO performance Status labels/columns, unapproved CRM CRUD.
- **Charts:** Apache Superset only; no invented frontend financial math or fallback React charts.

## All included Markdown files (27)

| File | Purpose |
|---|---|
| `00_README.md` | Starting guide and change precedence |
| `01_CHANGE_CONTROL_AND_SCOPE.md` | Boss decisions, removed features and data source supersession |
| `02_PRODUCT_REQUIREMENTS.md` | Role-based product requirements |
| `03_INFORMATION_ARCHITECTURE_AND_ROUTES.md` | Next.js routes and navigation |
| `04_SCREEN_SPECS_AND_WIREFRAMES.md` | Detailed page layouts and approved screen scope |
| `05_UX_FLOWS_AND_INTERACTIONS.md` | UX flows, filters and interactions |
| `06_DESIGN_SYSTEM.md` | Sterling-inspired color and component tokens |
| `07_FRONTEND_ARCHITECTURE.md` | App Router, database repository and data boundaries |
| `08_DATA_MODEL_AND_SEMANTIC_KPIS.md` | Financial view fields, semantic grain, finance sign-off |
| `09_SUPERSET_ANALYTICS_AND_CHART_CATALOG.md` | Superset chart catalog and embedding security |
| `10_API_CONTRACTS.md` | Proposed Next.js BFF/DTO contracts sourced from database views |
| `11_AUTH_RBAC_AND_SECURITY.md` | Authentication, RO and regional scope isolation |
| `12_MOCK_DATA_AND_FIXTURES.md` | Deterministic synthetic fixtures for development |
| `13_QA_ACCEPTANCE_AND_TESTS.md` | Functional, security, financial and visual QA |
| `14_DELIVERY_ROADMAP_AND_DOD.md` | Milestones and production delivery gates |
| `15_OPEN_QUESTIONS_ADRS_AND_DEPENDENCIES.md` | Open questions, decisions and approvals |
| `16_MASTER_IMPLEMENTATION_PROMPT.md` | Single master implementation prompt |
| `17_REQUIREMENTS_TRACEABILITY.md` | Source-to-change traceability |
| `18_ENV_AND_OPERATIONS.md` | Secret configuration, operations and monitoring |
| `19_ACCESSIBILITY_AND_RESPONSIVE.md` | Accessibility and responsive behavior |
| `20_IMPLEMENTATION_BACKLOG.md` | Engineering backlog |
| `21_NEXTJS_APP_ROUTER_IMPLEMENTATION.md` | Detailed Next.js App Router implementation |
| `22_BRAND_DIRECTION_AND_HANDOFF.md` | Sterling-inspired branding direction |
| `23_CRM_DATABASE_INTEGRATION_ARCHITECTURE.md` | Direct CRM database connectivity architecture |
| `24_CRM_DATABASE_SCHEMA_AND_VIEW_MAPPING.md` | Actual CRM table/view discovery and mapping worksheet |
| `25_CRM_DATABASE_QA_AND_CUTOVER.md` | Database/RLS/financial parity test and cutover checklist |
| `26_SUPERSET_SELF_HOSTED_SETUP.md` | Self-hosted Apache Superset setup, connection and embedding |

## Architecture in one view

```text
Existing CRM Database
  ├─ approved source tables → Next.js server-only, parameterized read-only queries
  ├─ approved finance SQL views → Next.js server-only KPIs/reports
  └─ same approved finance SQL views → self-hosted Superset read-only connection

Browser → authenticated Next.js App Router (server pages, scoped BFF, UI)
Browser → embedded Superset dashboard (guest token from trusted Next.js server)
```

## Development sequence

1. Read `01`, `02`, `07`, `08`, `09`, `11`, `15`, `16`, `21`, `23`, `24`, `25`, `26`.
2. Build a **demo/synthetic mode** with deterministic fixture-backed repository; no fabricated database object names.
3. Obtain DB vendor, read-only connection approvals, actual table/view definitions, and role entitlement source; complete `24`.
4. Implement only reviewed, **scoped and parameterized** Node-runtime database repository methods.
5. Download/deploy Apache Superset in a local nonproduction sandbox first, then obtain production-grade BI deployment approval (`26`).
6. Validate finance/view/Superset parity and negative cross-region tests (`25`, `13`); present for sign-off.

## Dependency gates

- **Blocking for production database integration:** actual database engine, schema/view inventory, approved query credentials, authentication and region/RO entitlement mapping, approved calculation view definitions, DB and BI network security.
- **Blocking for live Superset embedding:** deployed version, reporting view access, dashboard UUIDs, embedding origins, guest-token broker and row-level security tests.
- **Blocking only for applicable financial KPI:** undefined Calculation Base, WHT/OPEX, accrual, rollover and reporting-day semantics must be signed off by Finance. Display unavailable, never fabricate.

Never commit DB passwords, production banking data or unrestricted connection strings. No browser-to-database access. This pack does not claim that CRM tables or financial views have been inspected or that Superset is already deployed.
