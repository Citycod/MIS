# Actionable Engineering Backlog / Ticket Breakdown

This is a proposed ticket inventory. Estimate during team planning; no invented dates, velocity or effort commitments.

## Epic E0 — Requirements and BI contract

- `E0-01` Product owner signs `01` scope/removal matrix.
- `E0-02` Finance specifies monthly movement reconciliation (`08`, Q05).
- `E0-03` Sponsor defines donut investment amount and rollover treatment (`08`, Q03–Q04).
- `E0-04` Identity team defines region/RO historical assignment and manager scope (`11`, Q07–Q08).
- `E0-05` BI spikes installed Superset SDK version/native filter capability/RLS (`09`, Q18).
- `E0-06` Finance resolves Calculation Base, WHT, OPEX and day-count blockers (`15`).

## Epic E0A — CRM database and approved SQL-view discovery

- `DB-01` Inventory actual CRM database engine/version, host, schema tables and calculated SQL views (`24`).
- `DB-02` Obtain approved read-only credentials/network/TLS, separate Superset BI account and Node driver decision (`23`).
- `DB-03` Confirm all KPI SQL view definitions, owner, period grain, currency, effective dating and approval status (`08`,`24`).
- `DB-04` Establish staff→RO→region entitlements and explicit server/query scoping tests (`11`).
- `DB-05` Confirm self-hosted Superset dev install, production deployment owner and secure datasets (`26`).

## Epic E1 — Frontend foundations

- `E1-01` Initialize/adapt **Next.js App Router + TS** project, Tailwind+shadcn, segment layouts/pages, lint/unit/e2e test harness; no Vite/React Router.
- `E1-02` Build authenticated Next.js `(workspace)/layout.tsx`, `AppShell`, sidebar, header, breadcrumbs, Profile menu.
- `E1-03` Build login with actual auth adapter, role redirect, expired session.
- `E1-04` Implement route-level and component-level permission guards.
- `E1-05` Build common top Region/RO/Date/Product filter with role-locked RO controls.
- `E1-06` Implement URL state, draft/apply/reset, effective scoped filter response, refresh/version cues.
- `E1-07` Build KPI financial formatter, skeleton/loading/error/unavailable/forbidden states.

## Epic E2 — Secure data access and analytics

- `E2-01` Build a **server-only typed SqlPerformanceRepository** using actual approved schema and SQL view contracts, plus narrow scoped BFF routes where browser calls are needed. Before DBA mapping use MockPerformanceRepository. **Do not invent SQL object names or recalculate financial KPIs.**
- `E2-02` Integrate verified identity scope and normalize Region/RO/Date/Product filters; PIS `/auth/me` and filter routes are **proposed application-owned contracts**, not CRM database routes.
- `E2-03` Implement Next.js `app/api/bff/analytics/guest-token/route.ts` forwarding to authorized backend guest-token broker (`10`/`11`), no browser server credentials.
- `E2-04` Create Superset dashboard registry, embedded renderer, token refresh and error/Retry.
- `E2-05` Build/verify scoped reporting datasets and RLS for RO and regional managers.
- `E2-06` Verify effective filters synchronize chart and API scope in pinned Superset deployment.
- `E2-07` Add data-version consistency check between cards and BI datasets.

## Epic E3 — Portfolio performance views

- `E3-01` RO Dashboard: KPI strip, monthly movement, position vs target, donut, financial scope.
- `E3-02` Regional Dashboard: region view, monthly position/flows, RO comparison, donut, drilldown.
- `E3-03` Portfolio Movement page: monthly detailed ledger and movement visual.
- `E3-04` My Portfolio and Regional Portfolio pages, authorized position table.
- `E3-05` RO regional comparison/detail page with route filter persistence.
- `E3-06` Monthly target allocation vs actual chart, remaining gap/run-rate display.

## Epic E4 — Customer and investment views

- `E4-01` Customer list + customer detail, historical assignments read-only.
- `E4-02` Investment list + investment detail, separate inflow and rollover.
- `E4-03` Product Investment Mix donut `MTD|YTD`, centered total and slice legend; reconcile to details.
- `E4-04` Maturities & Rollovers monthly list, linked rollover detail and filtering.

## Epic E5 — Approved financial/reporting views

- `E5-01` Profitability cards and approved monthly income/expense chart.
- `E5-02` Profitability deal-level detail with pending-rule metadata.
- `E5-03` Targets & Run Rate RO/regional detail.
- `E5-04` Report catalog/viewer and access-controlled export.
- `E5-05` My Profile and preferences.

## Epic E6 — Verification and release

- `E6-01` Unit/component coverage for global filter and finance rendering.
- `E6-02` E2E access isolation for regions, ROs, customers, deals and exports.
- `E6-03` BI reconciliation for monthly portfolio movement, WACC and donut sums.
- `E6-04` Test forbidden chart/data from native Superset filters and token tampering.
- `E6-05` Visual design / WCAG 2.2 AA / 1440, 1280, 1024 and mobile testing.
- `E6-06` Removal regression: confirm no Account Opening, daily accounts, Recent Activity, Status leaderboard or standalone Product Performance UI.
- `E6-07` Release cutover, observability, secrets/CSP review, user acceptance and documents.

## CRM cutover acceptance tickets

- `DB-07` Verify driver/TLS/read-only grants, parameterization, connection pooling and SQL view contract tests in approved staging.
- `DB-08` Reconcile CRM source table → signed-off calculated view → Next.js KPI → Superset chart/report for exact month/scope/currency.
- `DB-09` Negative cross-region/RO/customer/deal tests, view-permission tests, Superset RLS and zero browser DB credential leakage.
- `DB-10` Staging UAT, database query telemetry, connection failure handling and rollback documented in `25`.
- `BI-01` Self-hosted Superset development install + deployable configuration and guest-token broker (`26`).

## Workflow and dependency notes

- Tickets touching financial data cannot be marked production-complete with sample/inferred formulas.
- Build UI with a deterministic MockPerformanceRepository early; label synthetic data and preserve parity tests.
- Manager security tickets (`E0-04`, `E2-05`, `E6-02`, `E6-04`) are **go-live blockers**.
- Do not replace a failing Superset chart with an unapproved React chart during UAT.
- Each ticket must link to relevant screen spec (`04`), database view mapping (`24`) and PIS BFF (`10`), security (`11`) and acceptance case (`13`).
