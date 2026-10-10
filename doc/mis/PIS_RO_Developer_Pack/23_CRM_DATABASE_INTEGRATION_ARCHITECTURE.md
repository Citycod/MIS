# Existing CRM Database + SQL Views — Integration Architecture

**Decision confirmed by project owner on 10 October 2026:** The existing CRM **database** is the source; PIS connects directly **from trusted server infrastructure**, not via CRM REST API. **All authoritative financial calculations are produced by DBA/finance-approved SQL views** in the database. Apache Superset is self-hosted and connects to controlled reporting views. This explicitly supersedes the 09 October CRM API + separate KPI-service assumption; it does **not** overturn the dashboard change-control decisions in `01`.

## 1. Scope and sources of truth

| Responsibility | Owner and authoritative source |
|---|---|
| Operational entities | Existing CRM tables: only confirmed tables/columns, never imagined |
| Performance math | Approved SQL views (or DBA-approved materialized reporting views with identical semantics) |
| Reporting history | CRM's existing effective-dated tables/snapshots and approved database views; gaps must be escalated |
| Authentication and entitlements | Verified bank identity source/approved database identity mapping; not a user-editable filter |
| Operational UI | Next.js App Router using authenticated server-side queries and limited scoped BFF routes |
| Charts | Self-hosted Apache Superset using read-only reporting views as its datasets |

**Do not** create another CRM, duplicate customer/deal masters, infer table names, or move approved calculation formulas into React, Next.js route handlers, or Superset chart expressions. **Do not** make browser→database connections. Never give Superset credentials that can write to CRM tables.

## 2. Topology

```text
Browser (authenticated RO / Regional Manager)
  ├─ Next.js App Router: shell, cards, tables, URL filters
  │    └─ Next.js server (Node runtime; verified session + effective authorized scope)
  │         └─ server-only DatabaseRepository / Query Layer (parameterized SQL)
  │              └─ CRM DB read-only application principal
  │                   ├─ existing CRM tables (read only where approved)
  │                   └─ approved reporting SQL views (authoritative KPIs)
  └─ Superset Embedded SDK (browser-only)
       └─ Next.js guest-token broker (server auth + verified scope)
            └─ self-hosted Superset
                 └─ independent read-only BI database principal
                      └─ same approved reporting SQL views
```

Superset's own metadata database (for Superset users, dashboards etc.) is **not** a CRM replica. The bank may choose approved reporting replicas/materialized views for performance or separation; they must preserve authoritative SQL definitions, effective-dated ownership and report cutoff. The diagram assumes network connectivity and supported database drivers **to be confirmed by the DBA/BI team**.

## 3. Trusted server querying requirements

- Database vendor, driver, TLS mode, ports, private DNS, read replica availability and views: **TBD, do not guess**.
- Next.js server uses Node.js runtime for database operations; do not attempt Node DB drivers in the Edge runtime or client components.
- Secrets are server-only (`CRM_DB_*` sample keys in `18`), stored in a secret manager and **never** exposed via `NEXT_PUBLIC_*`.
- DB account: least privilege, ideally `SELECT` on approved reporting views and only the strictly necessary base tables; no schema modification/DDL/DML privileges.
- Read-only transactions and pool limits; bind parameters and allowlist filter/sort columns. Reject arbitrary SQL, table names, view names and connection strings from client requests.
- Enforce user authorization **before** query and **in** the data access path. For Regional Managers, intersect requested `regionId` and `roId` with database/identity-derived assignments; for RO, lock to own assignment.
- Effective-dated RO/customer/region assignment must be used for historical months if that is the approved attribution definition.
- DB-native row-level security or invoker security may strengthen isolation if supported; if only a service principal exists, all query paths—including lookup by ID, search, exports and drilldowns—must enforce authorized predicates in server-side queries. Confirm view execution identity/definer behavior with DBA.
- Database error responses must not leak SQL text, hostnames or personally identifiable details to users. Log redacted correlation IDs, not raw records.

## 4. Database repository contract (logical, not exact SQL)

```ts
interface AuthorizedScope {
  userId: string;
  role: 'RO' | 'REGIONAL_MANAGER';
  allowedRegionIds: string[];
  allowedRoIds: string[];
  effectiveRegionId: string;
  effectiveRoIds: string[];
}
interface AppliedPeriod {
  mode: 'MTD' | 'YTD' | 'CUSTOM';
  from: string; to: string; asOf: string;
  productId: string | null;
}
interface PerformanceRepository {
  getDashboard(scope: AuthorizedScope, period: AppliedPeriod): Promise<DashboardDTO>;
  getMonthlyMovement(scope: AuthorizedScope, period: AppliedPeriod): Promise<MovementDTO>;
  listCustomers(scope: AuthorizedScope, period: AppliedPeriod, page: Page): Promise<CustomerPageDTO>;
  listInvestments(scope: AuthorizedScope, period: AppliedPeriod, page: Page): Promise<InvestmentPageDTO>;
  listRoes(scope: AuthorizedScope, period: AppliedPeriod, page: Page): Promise<RoPageDTO>;
}
```

Names above are application contracts, not discovered source tables/views. For development, supply a deterministic **MockPerformanceRepository** with no invented real database identifiers. Switch to **SqlPerformanceRepository** only after `24` mapping and security approval.

## 5. Calculation and source boundary

- **Tables** provide source attributes, transactions, authoritative balances and historical assignments where available.
- **Approved SQL views** provide: portfolio positions/movements, targets, achievement, gaps, remaining monthly run rates, WACC weighted components, income, expense, margin, WHT, OPEX, profitability and eligible product investment mix **only when corresponding definitions are signed off**.
- Do not create a second “KPI microservice” as a prerequisite. The Next.js data layer simply reads verified views and formats values. A database view can satisfy the original source's requirement that formulas exist in a central KPI layer separate from charts.
- All financial read APIs must return calculation/view version, report `asOf`, month grain, currency, and freshness/cutoff as supported; unknown metadata is a documented contract gap.
- Reconciliation: dashboard KPI values, drilldown tables, export and Superset must agree for same scope, period, product, currency and view version.

## 6. Security boundary for embedded Superset

- Superset uses a dedicated BI read-only principal limited to approved views; use a bank-approved TLS/private-network DB connection.
- Superset dataset or database policy must restrict underlying rows; guest-token RLS and dataset permissions must not permit cross-region data leakage through filters, SQL Lab, exports, chart queries, or dashboards. If the chosen database supports native RLS on restricted views, evaluate additional DB-level enforcement.
- Guest tokens are minted by trusted Next.js server/broker for preapproved dashboards with short expiration and verified allowed regions/ROs. Client never provides raw SQL or the resource UUID to be trusted blindly.
- External filter synchronization varies by Superset version. Verify MTD/YTD, region, RO, date and product filter parity on the selected release; fail closed or clearly block mismatching charts.

## 7. Minimum dependencies before production hookup

1. DBA confirms engine/version, private access mechanism, service principals and read-only roles.
2. DBA/finance provide actual schema + approved **view names**, columns, units, definitions, reporting grains, PKs and effective-date rules (`24`).
3. Bank identity team confirms RO↔staff mapping and Regional Manager↔region entitlement source.
4. BI team confirms Superset can connect to the database/approved replica with matching view versions.
5. Security signs off privacy, dataset permissions, external embedding and scope-isolation tests.
6. Finance signs off unresolved Calculation Base / WHT / OPEX / rollover / period policies; hide unavailable metrics until approved.

## 8. Decisions not yet approved

Database engine, SQL dialect, direct production vs reporting replica, materialization, query timeout, filter pushdown, role grants, DB-native RLS, refresh mechanics, view naming, and source schema are **unknown**. The implementation agent must NOT hard-code assumptions for any of these. See `15` and `24`.
