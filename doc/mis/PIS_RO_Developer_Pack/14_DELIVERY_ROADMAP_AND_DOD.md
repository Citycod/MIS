# Delivery Roadmap, Epics and Definition of Done

## Workstreams

- **Product & Finance:** resolve ambiguity and approve metric definitions.
- **Design:** RO and Regional Manager screen-level designs and states; regional filter patterns.
- **Frontend:** Next.js App Router shell/layouts, RSC server boundaries, role scope, filter state, pages, client-only secure Superset container, tests.
- **Database + server integration:** DBA-approved SQL views and read-only permissions, server-only parameterized queries, exports and scope enforcement.
- **Data/BI:** actual CRM table/view discovery, Finance-approved SQL definitions, effective-dated region mapping, reconciliation, self-hosted Superset dashboards and RLS.
- **Security/QA:** threat model, automated authorization/financial/visual testing.

## Suggested incremental milestones (no invented calendar estimates)

### M0 — Requirements sign-off / decision spike

**First integration gate:** obtain CRM database engine/version, schema catalog, approved finance SQL view inventory, read-only service access, TLS/network clearance, connection pooling limits and region/RO attribution policy. Complete `24` before writing live SQL.

Deliver latest-boss redline, menu removal list, ROI scope decision, MTD/YTD chart definition, exact regional membership model, Superset deployed version/embedding prototype. Close all BLOCKER decisions that affect data math or RLS.

### M1 — Foundational frontend + authorization

Deliver login, app shell, profile, routing, RO and RM roles, top shared filter bar, authorized `/filters` contract, URL persistence, design system, 401/403 handling.

### M2 — Minimum useful dashboards

Connect a typed **server-only read-only SQL repository** against discovered CRM tables and approved financial SQL views. No CRM REST API gateway or standalone KPI microservice is needed. Use deterministic mock repository until DBA and Finance sign view contracts.

RO Dashboard and Regional Manager Dashboard, mock or real SQL-view-backed KPI DTOs, monthly movement chart and region RO comparison, with **no banned components**. End-to-end filter parity and regional RLS tested.

### M3 — Portfolio/investment drilldowns and product investment mix

My Portfolio, Portfolio Movement, Customers, Investments, Detail views; product-mix donut MTD/YTD; monthly ledger; ROI scoped region drilldown and full reconciled fixture set.

### M4 — Financial breadth, maturities, reports

Profitability, Targets/Run Rate, Maturities/Rollovers, report viewer and authorized exports, period metadata; only officially approved financial metrics surfaced.

### M5 — Production hardening

SLOs, trace IDs, resilient embeds, accessibility audit, pen-test remediation, consistency between database SQL views and Superset, feature flags, runbooks, staging UAT.

## Critical path / dependencies

1. **Reporting grain and region hierarchy** before regional calculations.
2. **Approved investment mix denominator** before donut dashboard release.
3. **Working Superset embed + RLS** before any live manager analytics.
4. **Calculation Base, WHT/OPEX and accrual policy** before profitability sign-off.
5. **Financial reconciliation** before reporting/export exposure.

## CRM database and approved SQL-view dependency gate

- DBA supplies database version, schema/table and **approved view** inventory, read-only connection grants, driver/network guidance, rate/query limits and audit policy.
- Finance approves calculated monthly position/movement, target/gap/pace, WACC, profitability and investment mix view semantics.
- Identity/security owners approve staff→RO→region mapping and effective-dated regional permissions.
- BI deploys a bank-approved self-hosted Superset instance with independent read-only view access, guest token broker and RLS.
- Unavailable CRM data fields or unapproved view calculations remain disabled with explicit user-facing availability states; no scaffold CRUD or invented values.

## Definition of Done: feature

- Requirements and screen spec accepted; role restriction tested.
- Four global filters in correct location and data parity ensured.
- Controls have real behavior; no clickable dead ends.
- Screen with mock data has a deterministic fixture-backed repository; production reads the approved CRM database only from trusted server code.
- Loading/error/empty/forbidden states implemented.
- Relevant automation tests pass and accessibility checks completed.
- Event logging does not disclose sensitive customer data.
- Database views and Superset provide matching scope/date/definition versions.
- Documentation, demo video/screens and runbook updated.

## Definition of Done: release

- No Account Opening, Daily Account Opened Today, Product Performance board, Recent Activities or Status scorecards on revised RO/regional UI.
- Regional manager can see/filter all and only authorized ROs.
- Donut toggles MTD/YTD on authorized investment amounts.
- Monthly portfolio movement reconciles and includes as-of date.
- Sensitive reports/exports secure end-to-end.
- All open blocking business questions signed off or related screens/metrics explicitly disabled.
