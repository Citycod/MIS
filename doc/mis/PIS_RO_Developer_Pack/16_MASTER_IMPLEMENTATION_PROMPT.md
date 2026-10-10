# MASTER BUILD PROMPT — PIS RO + Regional Manager Frontend

> Copy this document as the primary instruction to your implementation agent, and attach the **entire developer pack directory** as working reference. When there is a conflict, apply latest boss review in `01_CHANGE_CONTROL_AND_SCOPE.md` first. Build working code only in the codebase, not inside these specs.

---

You are a **Principal Product Engineer, Enterprise Banking UX Architect, Senior Next.js App Router/TypeScript Developer and Apache Superset Integration Specialist**.

## Mission

### Confirmed direct CRM database + financial SQL views integration (10 October 2026 — highest technical precedence)

The project owner has **withdrawn the previous CRM API + separate KPI service design**. Source operational data is stored in the **existing CRM database**, and **all financial calculations are in approved database SQL views**. Build PIS as a **read-only server-side database consumer**, using a `server-only` `PerformanceRepository` / SQL adapter called from authenticated Next.js Server Components or narrow BFF Route Handlers. Do not connect browser code to the database and do not expose hostnames, connection strings or credentials. **Do not** create CRM master tables, a fake CRM REST adapter, new data-entry CRUD or financial formulas in JavaScript or Superset chart SQL. Finance/DBA must supply actual source table and view names, approval version, units, reporting cutoffs, and regional-authorization relationships; no vendor/SQL dialect is known yet. Until verified, implement a deterministic `MockPerformanceRepository` and visibly label synthetic data. Superset is installed/self-hosted separately and connects to the **same approved SQL reporting views**, using a distinct read-only DB principal and verified RLS for region/RO scope. Follow `23_CRM_DATABASE_INTEGRATION_ARCHITECTURE.md`, `24_CRM_DATABASE_SCHEMA_AND_VIEW_MAPPING.md`, `25_CRM_DATABASE_QA_AND_CUTOVER.md` and `26_SUPERSET_SELF_HOSTED_SETUP.md`. The boss's UI scope, Next.js framework and Sterling-inspired palette remain unchanged.

Build a production-oriented **Performance Information System (PIS)** frontend for **Relationship Officers** and **Regional Managers**, based on the included 15-page RO Performance & Profitability requirements document as revised by the latest boss notes and summarized in this development pack.

This is **not** a generic admin dashboard. It is a finance-grade performance application intended to let an RO understand position, target, gap, required pace, monthly movement, investments and profitability, and to let a Regional Manager see and compare **all ROs assigned to their authorized region**.

### Priority and guardrail

**Newest stakeholder revision has priority over earlier UI mockups, previous chat prompts, and initial recommendations.** Do not bring removed features back because an earlier screenshot contained them.

## Revised non-negotiables

1. **NO Account Opening module** in the current release. No accounts-opened-today, MTD/YTD account-opening performance, wizard, funnel, report, menu, create-account CTA or approval journey.
2. **NO Daily Performance landing page or daily account-opening visuals.** Replace that area with **Monthly Portfolio Movement**. A numeric daily required run-rate may exist only if finance/business approves its denominator; do not add a daily performance chart.
3. **NO standalone Product Performance page** or product target/actual, profit, ranked-scorecard breakdown on dashboards.
4. **DO include one product investment composition DONUT** with explicit **MTD/YTD toggle**, displaying share of an approved investment amount by product. This is NOT a product-performance analysis. Clearly label numerator, denominator and period.
5. **NO status column/performance badges** in RO performance boards, no Recent Activity chart/feed on dashboards. Do not confuse lifecycle state in the data model with a dashboard status.
6. **Put common Region / RO / Date / Product filters at the TOP of EVERY board**, above KPI cards and charts. Provide Apply and Reset; reflect effective scope and as-of date.
7. **Regional Manager** can view all and only authorized ROs assigned to selected authorized region(s); selected RO or All ROs; complete scope throughout API, Superset, exports and direct links.
8. **Use Apache Superset for ALL analytical charts.** Do not use React-native chart libraries as silent substitutes.
9. **All financial calculations originate from DBA/Finance-approved SQL views in the existing CRM database**, not component calculation, a separate KPI microservice or Superset-only chart SQL. Do not fabricate profitability/interest/position values.
10. **Monthly aggregation on charts**, MTD/YTD period controls and correct distinction between stock (as-of portfolio position) and flow (inflow, withdrawal, accrual) metrics.

## Product scope and roles

### Relationship Officer

My Dashboard; Portfolio Movement; My Portfolio; My Customers + Customer Details; Investments & Deals + Investment Details; Profitability Analysis; My Targets & Run Rate; Maturities & Rollovers; My Reports; My Profile.

RO's Region and RO filter controls are visible but **locked** to authenticated scope. Date and Product are actionable. RO must not view or search another RO's restricted data.

### Regional Manager

Regional Dashboard; Portfolio Movement; RO Performance list/comparison + RO detail; Regional Portfolio; Customers; Investments & Deals; Profitability; Targets & Run Rate; Maturities & Rollovers; Regional Reports; My Profile.

Manager can select **one of own authorized region(s)** and **all ROs in region** or a specific assigned RO. Direct URLs, export files and Superset must enforce the same scope.

**No** executive-wide, admin/master-data maintenance, branch-wide superuser screens or account-opening forms without new authorization.

## Technology

Use **Next.js App Router with strict TypeScript**, React Server Components by default, narrow client components for interactive UI, Tailwind CSS + shadcn/ui, Lucide, TanStack Query, TanStack Table, and `@superset-ui/embedded-sdk` in a browser-only Client Component. Use React Hook Form/Zod only for approved forms. **Never use Vite, React Router or a separate SPA router.** Follow `07_FRONTEND_ARCHITECTURE.md` and `21_NEXTJS_APP_ROUTER_IMPLEMENTATION.md`. Follow an existing Next.js repository’s conventions before generating new files.

## UI styling and quality

Follow the **user-confirmed Sterling Bank Nigeria–inspired brand direction** in `06_DESIGN_SYSTEM.md` and `22_BRAND_DIRECTION_AND_HANDOFF.md`: Sterling-inspired red `#CF2E2E` for primary actions and selection; charcoal `#333333` sidebar; white surfaces on warm-neutral `#F8F9FA` canvas; optional burgundy `#741F24` login brand panel; restrained gold `#CF8D4D` highlights; Inter/system font, tabular financial figures, subtle borders and compact financial tables. These are proposed styling tokens, **not certified Sterling official guidelines**. Prior navy/royal-blue screenshots are layout references only; do not reproduce them as the production theme. Use an independently owned PIS logo/identity unless license to use external brand assets is confirmed.

Use a consistent app shell with left sidebar, topbar search, user menu, breadcrumbs, page title, **global filter bar above cards**, numeric KPI cards, Superset analytical sections and authorized operational tables. Use graceful responsive layout at 1440/1280/1024px and mobile.

For Login use a restrained split layout at desktop (burgundy/red PIS brand panel and accessible white sign-in form) and role-based landing. Do not offer fictitious Microsoft login or backend functionality.

## Main RO Dashboard composition

1. Page heading `My Performance`, reporting/as-of metadata.
2. Immediately: **Region 🔒 | RO 🔒 | Date | Product | Apply | Reset**.
3. KPI cards: Current Portfolio, Annual Target, Achievement, Remaining Gap, Required Monthly Pace, optionally approved Daily Pace.
4. Superset **Monthly Portfolio Movement** signed bar chart.
5. Superset **Closing Portfolio Position vs Approved Period Target** trend.
6. Superset **Product Investment Mix — MTD/YTD** donut (eligible investment amount, product share, not product performance).
7. Optional approved monthly profitability visual and monthly movement ledger.
8. **NOT PRESENT:** Account Opening, Recent Activities, product performance scoreboard, daily performance trend, status.

## Main Regional Manager Dashboard composition

1. Page title `Regional RO Performance`, selected region and as-of period.
2. **Region | RO (All in region or one) | Date | Product** in upper filter strip.
3. KPI cards: Regional Portfolio, Approved Regional Target, Achievement %, Gap, Monthly Net Movement, Required Monthly Pace and approved Profitability where available.
4. Superset `Regional Monthly Net Movement` diverging bar chart.
5. Superset `Regional Closing Portfolio Trend` line chart.
6. Superset `RO Position vs Target` horizontal grouped bar (sorted and understandable).
7. Superset `RO Target Gap` ranked horizontal bar or compact table.
8. Superset `Product Investment Mix (MTD/YTD)` donut, filtered to region and optional RO.
9. RO comparison table: Name, Team/Branch, Closing Position, Target, Achievement, Gap, Monthly Net Movement, Pace, approved WACC and Profitability; **NO Status**. Row opens RO detail and preserves filters.

## Remaining screens

Implement exact in-scope fields and interactions per `04_SCREEN_SPECS_AND_WIREFRAMES.md`, `05_UX_FLOWS_AND_INTERACTIONS.md`, and `03_INFORMATION_ARCHITECTURE_AND_ROUTES.md`.

- Portfolio Movement: monthly reconciliation ledger; bars/line; month grain.
- My Portfolio: point-in-time balances, customer positions, date and product scopes; no product performance leaderboard.
- Customers: authorized list and customer detail; historical RO assignment context, read-only initially.
- Investments & Deals: inflow/rollover separated; term, rates, maturity, authorized customer; detail calculation breakdown with approval flags.
- Profitability: deal vs management margin definitions; pending calculations displayed transparently.
- Targets: approved annual/month allocation, position gap and monthly pace; no edit controls in current release.
- Maturities/Rollovers: month-based maturity schedule, linked rollovers; no assumed mutation actions.
- Reports: portfolio movement, RO position, profitability, investments/maturity and regional RO comparison; no account-opening report; secure export only if available.
- Profile: identity and preferences.

## Database view and application DTO rules

Read `08_DATA_MODEL_AND_SEMANTIC_KPIS.md`, `10_API_CONTRACTS.md`, `23`, and `24`. Query only real, mapped views/tables with approved grants; financial KPIs are SQL-view outputs.

- Money and precise rates as decimal strings in API; no arbitrary JS floating-point financial math.
- Portfolio position is a *snapshot*; monthly inflows/outflows/interest are additive *flows*.
- Do not double-count rollover as external new inflow unless approved.
- MTD/YTD scopes are explicitly defined; YTD chart uses monthly buckets; current month visibly provisional.
- WACC aggregated using weighted numerators and denominators, never plain average of RO percentages.
- Report and KPI responses identify as-of, dataVersion, metricDefinitionVersion, currency, availability.
- If Calculation Base/WHT/OPEX/deal margin official definition missing, render `Pending financial definition`, not a made-up KPI.
- Use deterministic, internally reconciled **mock SQL-view outputs** until DB schema and views are approved; no invented client records or production SQL identifiers.

## Superset integration rules

Read `09_SUPERSET_ANALYTICS_AND_CHART_CATALOG.md`, `11_AUTH_RBAC_AND_SECURITY.md`.

- `@superset-ui/embedded-sdk` for approved dashboard embed UUIDs.
- Secure Next.js server Route Handler obtains scoped guest tokens from Superset; no admin/service account credentials in browser.
- Restrict dashboard resources, RLS rows, datasets and allowed embed origins.
- Test Superset native filters and embedding controls **against installed deployment version**, never invent an SDK hook.
- Frontend global filters and charts must never show different region/RO/product/period scopes. Implement verified sync/fallback or visibly block a chart if correct sync cannot be achieved.
- Load dashboard skeleton/error/refresh independently of KPI cards. Group related charts; don't create a heavy iframe for every KPI.
- Product donut has MTD/YTD switch and chart semantics described above.

## Next.js mandatory implementation constraints

- Use `src/app` route segments, `layout.tsx`, `page.tsx`, dynamic `[id]` segments, `loading.tsx`, `error.tsx` and `not-found.tsx` as appropriate. No `react-router-dom`.
- Protected workspace layouts and Server Components must verify the authenticated session and region/RO permissions **before** fetching or rendering confidential data; never rely only on middleware/proxy checks.
- Client-side interactive filter bar commits canonical query strings with `next/navigation`; server validates requested scope. Use `next/link` for navigation.
- Use `src/app/api/bff/**/route.ts` Route Handlers when a browser-facing secure BFF is needed, including Superset guest-token requests. The trusted Next.js server must validate role, session and dashboard; never expose server account credentials.
- Avoid shared/static caching for customer/financial data; do not place secrets in `NEXT_PUBLIC_*` environment variables. Authenticated responses and token endpoints must be private/no-store.
- Embed `@superset-ui/embedded-sdk` **only in browser-mounted Client Components**; no SSR, and no chart library substitution. Clean up embeds, maintain BI/KPI scope parity, and handle expiry/error states.
- Next.js `middleware.ts`/`proxy.ts` may provide optional UX redirects, but are not sufficient for sensitive data authorization. Validate protected records and API requests at their sources.
- Deliver a documented Next.js environment contract and confirm production deployment mode (Node/container/approved platform) can execute route handlers and privately access the approved CRM database; do not assume static-only hosting.

## Essential components

`AppShell`, `Sidebar`, `TopBar`, `GlobalFilterBar`, `RoleGuard`, `ScopeGuard`, `KpiCard`, `FinanceValue`, `AchievementProgress`, `MetricDefinitionTooltip`, `SupersetDashboard`, `DataTable`, `FilterSummary`, `MonthlyMovementLedger`, `ROComparisonTable`, `CustomerSummary`, `DealFinancialBreakdown`, `LoadingState`, `ErrorState`, `EmptyState`.

## Interaction and security

- All navigable UI elements must work; do not fake save, export, renew, submit or login success.
- Query keys include effective scope and reporting version; invalidate on permission change.
- RO/region restrictions enforced in the trusted Next.js server SQL repository and Superset dataset/RLS permissions; client filter is not authorization.
- Export only authorized, exact applied period/scope, through server-scoped database view queries.
- Show error/forbidden/loading/empty/partial/unapproved-metric states.
- Accessibility per WCAG 2.2 AA; keyboard focus, semantic tables, good contrast.

## Build strategy

**Before writing code:** inspect repository, dependencies, actual database schema/view grants and Superset capabilities; list decisions affecting build. Then implement phases:

1. Shell/auth/role-aware route navigation.
2. Shared global filter contract and session scope validation.
3. RO and Regional dashboards with deterministic mock data and Superset placeholders (not fake chart renderer).
4. Secure Superset integration and cross-filter reconciliation.
5. Portfolio, customers, investment detail and movement ledger.
6. Approved profitability, targets, maturities, reports and profile.
7. E2E/security/data/accessibility/visual tests.

Provide per-phase working routes with no dead controls. If database access is not yet available, use a deterministic mock database repository with documented interfaces; do not claim live Superset charts without connection. Stop and flag blockers rather than guessing approvals.

## Tests and acceptance

Use `13_QA_ACCEPTANCE_AND_TESTS.md` as the minimum e2e/QA contract. Explicit tests for regional RLS, filter placement and parity, investment donut MTD/YTD, removed screens/charts/status, monthly balance reconciliation, no unauthorized export, and prior assignment histories.

## Deliverables

- Running Next.js App Router frontend; protected Server Components and layouts, typed server-only database repository, narrow BFF routes, secured configurable client-only Superset adapter.
- Screens listed in `03`/`04` with role-aware navigation.
- Consistent design system, skeletons, empty/error states and responsive behavior.
- Deterministic demos for RO and Regional Manager and account access isolation tests.
- README with setup/env/database view mapping and deployed Superset dashboard UUID registry.
- Proposed PIS BFF/DTO contract and unresolved product/DB-view questions; no silent finance assumptions.
- Test suite with results and deployment/integration checklist.

**Final instruction:** Build the approved scope and no other scope. The boss's new design direction is **MONTHLY PORTFOLIO MOVEMENT + REGIONAL MANAGER CONTROL + TOP FILTERS + PRODUCT INVESTMENT MIX DONUT**, not an account-opening dashboard.
