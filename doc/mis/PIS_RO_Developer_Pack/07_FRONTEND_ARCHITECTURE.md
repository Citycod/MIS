# Frontend Architecture — Next.js App Router + TypeScript

## Confirmed stack

**Next.js (App Router)**, React + strict TypeScript, Tailwind CSS + shadcn/ui, Lucide icons, TanStack Query for interactive client-side data and invalidation, TanStack Table for authorized operational tables, React Hook Form + Zod for approved forms, `date-fns` as needed, Vitest + React Testing Library for component/unit tests, Playwright for E2E, and `@superset-ui/embedded-sdk` for analytical dashboards.

**Do not use Vite, React Router, `BrowserRouter`, `Routes`, `react-router-dom`, or a separate SPA entrypoint.** Use `app/` filesystem routes, `next/link`, `next/navigation`, route segment layouts and Server Components. Preserve existing Next.js project conventions if a repository is supplied.

## Core boundaries

### Confirmed source and trusted integration path

`Browser → authenticated Next.js Server Components / narrow BFF Route Handlers → server-only SqlPerformanceRepository → existing CRM tables and finance-approved SQL calculation views`. Self-hosted Apache Superset independently connects to the **same approved calculation/reporting views** using its own read-only BI database account. Do not implement a CRM REST API adapter or separate KPI calculation service. The DB engine, physical schema and SQL view names are unknown until DBA discovery (`24`). Sample server-only environment variables `CRM_DB_*` are never prefixed `NEXT_PUBLIC_*`. Use an isolated `MockPerformanceRepository` until actual schema mapping is verified. See `23`, `24`, `25`, `26`.


1. **Next.js Server Components** own access-controlled initial page composition, identity and scope reading, authorized SQL-view reads and reporting metadata; never leak server credentials, raw access tokens or private API host configuration.
2. **Client Components** own interactive filter bars, form controls, TanStack Tables, client query state, dialogs and Superset iframe lifecycle. Use `'use client'` at narrow leaf boundaries, not globally.
3. **Route Handlers** under `src/app/api/bff/**/route.ts` provide a trusted *backend-for-frontend* for scope normalization, secure exports and the Superset embedding guest-token exchange where needed. They validate session, CSRF/origin where relevant, role and effective region/RO scope and execute approved read-only repository methods.
4. **DBA/Finance-approved SQL views** own authoritative financial calculations. A bank-approved identity source and server/database authorization own permissions; Superset visualizes those same approved reporting views only.
5. **URL query parameters** are canonical for applied Region / RO / Date / Product / MTD / YTD context. `searchParams` are untrusted; validate and normalize scope server-side before any fetch or embed.

## Suggested source structure

```text
src/
  app/
    layout.tsx                         # global HTML/providers boundary
    providers.tsx                      # minimal client providers
    (auth)/
      login/page.tsx
      session-expired/page.tsx
    (workspace)/
      layout.tsx                       # secured shell, verified session
      ro/
        dashboard/page.tsx
        portfolio-movement/page.tsx
        portfolio/page.tsx
        customers/page.tsx
        customers/[customerId]/page.tsx
        customers/[customerId]/[tab]/page.tsx
        investments/page.tsx
        investments/[investmentId]/page.tsx
        profitability/page.tsx
        targets/page.tsx
        maturities/page.tsx
        reports/page.tsx
        reports/[reportKey]/page.tsx
      regional/
        dashboard/page.tsx
        portfolio-movement/page.tsx
        relationship-officers/page.tsx
        relationship-officers/[roId]/page.tsx
        portfolio/page.tsx
        customers/page.tsx
        customers/[customerId]/page.tsx
        investments/page.tsx
        investments/[investmentId]/page.tsx
        profitability/page.tsx
        targets/page.tsx
        maturities/page.tsx
        reports/page.tsx
      profile/page.tsx
    api/
      bff/
        analytics/guest-token/route.ts
        filters/resolve/route.ts
        reports/exports/route.ts
    forbidden/page.tsx
    not-found.tsx
    error.tsx
  components/
    layout/                           # AppShell, sidebar, topbar, breadcrumbs
    filters/                          # GlobalFilterBar (client), URL normalization helpers
    finance/                          # KPI cards, read-only server values, formatters
    tables/                           # TanStack Table client leaf components
    superset/                          # SupersetDashboard.client.tsx, states, registry
  features/
    auth/ ro-dashboard/ regional-dashboard/ portfolio-movement/
    portfolio/ customers/ investments/ profitability/ targets/
    maturities/ reports/ profile/
  lib/
    server/                           # server-only auth, database repository, permissions, Superset config
    client/                           # typed browser BFF, React Query hooks
    filters/                          # canonical params, zod parsing, serialization
    finance/                          # formatting, NEVER authoritative KPI calculations
  mocks/                               # isolated deterministic MSW fixtures
  tests/                               # unit, integration and Playwright
```

Route groups `(auth)` and `(workspace)` **do not affect URLs**. Dynamic Next.js segments are `[customerId]`, `[roId]`, etc.; `:customerId` in `03` describes the public route pattern only.

## Data ownership and rendering

| Concern | Server/Client placement | Security rule |
|---|---|---|
| Authentication + region/RO claims | Server-only session validation and backend | Never infer permission from query params or display name |
| Initial KPI cards | Server Component using authorized DB view read | `cache: 'no-store'` (or equivalent authenticated dynamic read) |
| Top global filter | Client Component; `useRouter`, `useSearchParams` | Applied params verified by backend before data use |
| Advanced operational tables | Client Component with scoped, paginated endpoints | All server-side authorization, pagination and sorting |
| Superset | Browser-only Client Component (e.g. dynamic import with SSR disabled inside a Client Component or effect-mounted SDK) | Guest token is scoped by trusted server; no admin secrets in browser |
| BI registry | Server environment/authorized API | No arbitrary dashboard UUID from the client |
| Exports | Route Handler → authorized database view / export workflow | Scope-checked and audited; no blind client-side CSV of restricted data |

## Global filter state

```ts
export type PeriodMode = 'MTD' | 'YTD' | 'CUSTOM';
export interface AppliedBoardFilters {
  regionId: string;       // required, authorized server-side
  roId: string | null;     // null = all authorized ROs in manager's region
  productId: string | null;
  period: PeriodMode;
  from: string;           // YYYY-MM-DD
  to: string;             // YYYY-MM-DD, inclusive as-of cut-off
  asOf: string;           // snapshot date
}
export interface FinancialMetric {
  value: string | null;   // decimal string; never unsafe float for money
  currency?: string;
  unit?: 'amount' | 'percent' | 'count' | 'rate';
  status: 'available' | 'pending-definition' | 'not-applicable' | 'unavailable';
  definitionId: string;
  asOf: string;
}
```

The internal metric API `status` is **not** an RO performance Status column or badge; those were explicitly removed from dashboards.

- Use draft controls until Apply; commit canonical query parameters with `router.replace` or `router.push` appropriately.
- Revalidate every requested region/RO combination on server; a RO's region and `roId` are locked to verified user scope; a regional manager may choose only assigned regions and ROs.
- Clearing/changing the region invalidates an incompatible RO selection.
- Preserve filters through detail links and Back without exposing unauthorized identifiers.
- TanStack Query keys include user/authorization scope, region, RO, product, period, asOf, reporting version and definition version; clear caches on logout or permission changes.
- Server-rendered approved SQL-view KPIs and browser-rendered Superset must use the same effective filter scope and `dataVersion` or clearly show incompatibility; do not show mismatched data as comparable.

## Superset embed lifecycle

- **Do not import/embed SDK in Server Components.** Keep embed host in a client leaf that mounts only in a browser and cleans up on unmount/filter scope changes.
- The client calls its own protected `POST /api/bff/analytics/guest-token`, not Superset's privileged guest-token mint API directly.
- Route Handler validates authenticated user + approved dashboard key + opaque authorized scope (not arbitrary SQL), then calls the approved Superset guest-token service server-side. The short-lived guest token is delivered only for the SDK's documented browser embed request.
- No universal parent-to-Superset cross-filter API should be assumed. Verify the exact installed Superset version. If filter parity cannot be guaranteed, block or visibly constrain affected charts rather than showing wrongly scoped analytics.
- Token renewal and iframe cleanup are tested, and embedded chart errors never blank the surrounding page.

## Caching and hydration policy

- Confidential account/portfolio responses: `cache: 'no-store'`, user-bound request identity, no shared static caching; avoid static generation of authenticated pages.
- No confidential customer data in public/static props, `NEXT_PUBLIC_*` variables, static metadata, or shared cross-user caches.
- Use client query hydration only for data eligible to be serialized to that authenticated client; ensure query keys and provider scope are isolated.
- Route handlers return appropriate `Cache-Control: private, no-store` for sensitive data and tokens.
- Review Next.js version-specific caching defaults and dynamic rendering behavior during implementation; don't rely on framework assumptions without tests.

## Failure handling and tests

- 401/session expired → login or session-expired; 403 → `forbidden` page; 409 → refetch stale snapshot; 422 → invalid filter; 429 → backoff; 5xx → retryable section error.
- Use Next.js `loading.tsx` and `error.tsx` boundaries as well as independent Superset skeleton/error states.
- Test protected deep links, role and region IDOR, stale client router state after logout, cached RSC responses and guest-token leakage.
- Perf: partial streaming/suspense for slow boards, defer noncritical embeds, server paginate operational lists, monitor Core Web Vitals.
- Strict TypeScript, ESLint, unit/integration E2E and verified WCAG 2.2 AA. No raw financial calculations in React, server Route Handlers, or Superset chart definitions: authoritative results come from approved database SQL views.

## Related documents

- `03_INFORMATION_ARCHITECTURE_AND_ROUTES.md`: public routes and navigation.
- `09_SUPERSET_ANALYTICS_AND_CHART_CATALOG.md`: approved chart catalog and embedding verification.
- `10_API_CONTRACTS.md`: normalized view DTOs and optional Next BFF boundaries.
- `11_AUTH_RBAC_AND_SECURITY.md`: server-side security and regional scope.
- `18_ENV_AND_OPERATIONS.md`: correct Next.js environment variables.
- `21_NEXTJS_APP_ROUTER_IMPLEMENTATION.md`: expanded implementation guide.
