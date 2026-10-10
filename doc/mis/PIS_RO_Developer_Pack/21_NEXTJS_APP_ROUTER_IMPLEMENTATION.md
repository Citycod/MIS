# Next.js App Router Implementation Guide — PIS RO + Regional Manager

**Status:** User-confirmed technology choice; concrete architecture recommendation, subject to codebase/backend assessment.  
**Framework:** Next.js **App Router** + React + strict TypeScript.  
**Do not use:** Vite, React Router, `react-router-dom`, browser-only SPA as app architecture, or a static-only export for this protected banking application.

## 1. Scope and authority

Implement only the revised features in `01`–`04`: role-specific RO and Regional Manager views, top Region / RO / Date / Product filters, **monthly portfolio movement**, MTD/YTD investment product-mix donut, approved position/target/run rate, profitability, customers, investments and scoped reports. Account Opening, daily account opening, product performance ranking/scorecards, recent activity dashboard widgets and dashboard Status indicators are out of the current release.

The underlying source requirement document and boss's notes outrank new engineering suggestions. Do not reinstate earlier screenshots showing removed features.

## 2. Architectural diagram

```text
Browser
  ├─ Next.js App Router shell + filter bar, RO/region UI
  │    ├─ Server Components → authorized, server-only SQL repository ─┐
  │    ├─ BFF Route Handlers → authorized SQL repository ────────────┤
  │    └─ SupersetDashboard.client.tsx → guest-token BFF              │
  │                                └─ self-hosted Superset            │
  │                                      └─ BI read-only SQL account   │
  └─ Next.js server (Node runtime, authenticated user/region/RO)     │
                                                                        ▼
                Existing CRM DB: source tables + finance-approved SQL views
```

**Security:** Node-server only database connection, least-privilege SQL principals, session-and-record scope checks, parameterized SQL, and independently verified Superset dataset/RLS restrictions. The user filter is never an authorization claim. No CRM REST adapter or separate KPI service.

## 3. Folder and route mapping

```text
src/app/
  layout.tsx                        # Root HTML body, typography, providers
  providers.tsx                     # minimal 'use client' TanStack providers
  (auth)/
    login/page.tsx                  # /login
    session-expired/page.tsx        # /session-expired
  (workspace)/
    layout.tsx                      # Secured, role-aware sidebar/topbar
    ro/dashboard/page.tsx           # /ro/dashboard
    ro/portfolio-movement/page.tsx  # /ro/portfolio-movement
    ro/portfolio/page.tsx           # /ro/portfolio
    ro/customers/page.tsx
    ro/customers/[customerId]/page.tsx
    ro/customers/[customerId]/[tab]/page.tsx
    ro/investments/page.tsx
    ro/investments/[investmentId]/page.tsx
    ro/profitability/page.tsx
    ro/targets/page.tsx
    ro/maturities/page.tsx
    ro/reports/page.tsx
    ro/reports/[reportKey]/page.tsx
    regional/dashboard/page.tsx     # /regional/dashboard
    regional/portfolio-movement/page.tsx
    regional/relationship-officers/page.tsx
    regional/relationship-officers/[roId]/page.tsx
    regional/portfolio/page.tsx
    regional/customers/page.tsx
    regional/customers/[customerId]/page.tsx
    regional/investments/page.tsx
    regional/investments/[investmentId]/page.tsx
    regional/profitability/page.tsx
    regional/targets/page.tsx
    regional/maturities/page.tsx
    regional/reports/page.tsx
    profile/page.tsx
  api/bff/
    analytics/guest-token/route.ts
    filters/resolve/route.ts
    reports/exports/route.ts
  forbidden/page.tsx
  error.tsx
  not-found.tsx
```

Adapt filenames for the existing repo structure if needed, while keeping **the same public URLs** from `03`. Route groups are pathless. Avoid conflicting `page.tsx` and `route.ts` in the same route folder. Use a shared dynamic page layout where appropriate to reduce repeated code.

## 4. Server Components vs Client Components

**Use Server Components by default** for:

- Protected dashboard/page container, auth+role lookup and authorized scoped data loading.
- Initial headline KPI cards and server-readable period metadata.
- Initial read-only entity detail and report description.

**Use Client Components for**:

- Global filters (`useRouter`, `usePathname`, `useSearchParams`) and draft/Apply/Reset behavior.
- Editable/interactive table state (sorting, column visibility, selection), modal dialogs and keyboard interactions.
- Superset's SDK (browser iframe); never import the SDK into a Server Component module.
- TanStack Query hooks for client-side authorized refetches, retries and optimistic state only where mutations are approved.

Avoid putting `'use client'` on the entire secured workspace layout just to add a dropdown. Pass server-validated serializable identity/scope to narrow client leaves; never pass secrets or privileged tokens.

## 5. Authentication and access checks

- Use existing bank SSO/OIDC where available; do not invent an email/password identity backend.
- Require a verified session before rendering secured workspace data; use server-only helpers for `getSession`, `assertRole`, `normalizeAuthorizedScope`, `canAccessRecord`.
- Validate every nested record ID (e.g., customer or investment) **at the backend**, regardless of parent route access.
- RO is fixed to its authorized RO/region mapping. Regional Managers can select only assigned regions and all/one RO within that region.
- Dynamic page requests, BFF handlers, export jobs and guest-token creation must independently check identity and scope.
- Optional Next.js middleware/proxy redirects enhance UX only; they do **not** replace session/record authorization.
- Secure cookies with correct `HttpOnly`, `Secure`, SameSite and CSRF/origin protections; audit denied scope and token issuance.

## 6. Data fetching and cache isolation

- Authoritative KPIs and snapshots are read from Finance/DBA-approved SQL calculation views, not from page-level JavaScript or an independent KPI microservice.
- For financial/customer reads, use **per-request, no-store** fetch semantics or the pinned Next.js version's equivalent. Do not statically generate user-specific pages.
- Every API response should carry effective filters, as-of/cutoff, currency, reporting dataVersion and metric definition version where relevant.
- On logout or role change, clear in-browser TanStack Query caches, invalidate session and block browser-back sensitive content.
- Only hydrate client queries that the authenticated principal is allowed to see; never persist cross-user cached customer data.
- Bank amount/rate values travel as **decimal strings**; money formatting can happen in UI, official financial calculations cannot.

## 7. Canonical applied global filters

```text
regionId=REG-01&roId=RO-001&period=YTD&from=2026-01-01&to=2026-10-08&asOf=2026-10-08&productId=FIXED_DEP
```

- Put Region, RO, Date and Product above KPI cards/charts on every analytics board.
- RO sees locked Region and RO controls (visible scope). Regional Manager sees authorized selections and an All ROs option.
- Source of truth is server-validated, entitlement-derived scope; URL is a presentation state request, **not authorization**.
- Support MTD/YTD/custom on applicable charts; monthly grain for time series even when YTD is selected.
- Share normalized filters with server-side SQL-view calls and Superset guest-token/dataset scope. If verified Superset native filter integration is not supported, provide a controlled fallback—never display incorrectly filtered charts.

## 8. BFF Route Handlers and server-only SQL repositories

**Confirmed 10 October:** use `import 'server-only'` repository modules and a database driver chosen **only after real database engine discovery**. Bind parameters; map real tables/approved financial views to normalized TypeScript DTOs. Enforce Region/RO permissions **in every query**; read-only database account and database-side security protections where supported. Next.js Server Components can query repository functions directly; browser interactions needing async JSON use narrow `src/app/api/bff/.../route.ts` handlers. Do not create `/api/v1` fake CRM API integration endpoints or a second finance-calculation service. Bank security approves credentials, network, TLS and scoped read permission. Unknown view = documented blocker, not permission to guess a table or formula (`23`,`24`,`25`).

The only HTTP surface implied by this app is its own narrowly scoped BFF: filter resolution, paged operational lists, protected export and Superset guest-token brokerage. Do not implement a generic SQL proxy, raw `query` parameter, arbitrary endpoint forwarding, or user-supplied view/table names.

### Superset guest token boundary

- Browser sends approved logical dashboard key and server-issued opaque scope reference to Next.js BFF.
- Next.js reads **server session** and normalizes scope; trusted Next.js server requests a limited guest token from Superset with **server-generated row-level restrictions**.
- Next.js returns short-lived guest token to SDK for embedded chart access, with `Cache-Control: private, no-store`.
- Never accept arbitrary dashboard UUID or raw SQL/RLS from the browser.
- Superset embed origin may be `NEXT_PUBLIC_SUPERSET_EMBED_ORIGIN` only if configured for browser embedding; Superset admin/service secrets remain server-only.
- Test expiration, refresh, crossfilter, origin allowlisting, cookie/CSP and scope tampering against installed Superset version.

## 9. Superset dashboard composition

Read chart inventory in `09`. Use embedded dashboard groups, not one iframe per small metric card. At minimum:

- RO dashboard: monthly movement diverging bars, month-end portfolio vs approved target, MTD/YTD investment mix donut.
- Regional dashboard: regional monthly movement, regional position trend, horizontal RO position-vs-target comparison and optional ranked gap bar, MTD/YTD investment mix donut.
- Supporting screens: approved income/expense trend, portfolio movement ledger chart, maturity buckets, run-rate/target comparisons.

No standalone Product Performance board, no daily accounts, no Account Opening module, no Recent Activity chart, no Status comparison column. Product **investment composition donut** is allowed and mandatory; do not reintroduce product **performance** ranking/scorecards.

## 10. UX/visual system

- Match the updated Sterling Bank Nigeria–inspired `06_DESIGN_SYSTEM.md`: charcoal navigation rail, Sterling-inspired red selection/CTA, white cards, warm-neutral gray background, limited gold highlights, Inter-like readable typography, strict grid and compact financial formatting. Earlier blue mockups are layout references only.
- Make filters first, metrics second, chart groups third, tables fourth; retain responsive layouts and WCAG 2.2 AA keyboard behavior.
- Use `next/link` for role-aware navigation; preserve filters through drilldowns without URL scope grants.
- Include meaningful empty, loading, forbidden, partial-data, financially-unapproved metric, Superset failed and session expired states.
- Do not include nonfunctional `Add New Account`, `Renew`, `Upload`, `Export` or `Edit` actions unless approved and connected to working backend capabilities.

## 11. Environment + operations

```dotenv
# public: visible in browser, nonsecret only
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SUPERSET_EMBED_ORIGIN=https://superset.example.com
NEXT_PUBLIC_FEATURE_PROFITABILITY=true

# private: Next.js server runtime only
CRM_DB_ENGINE=<TBD DATABASE VENDOR>
CRM_DB_HOST=<DBA-approved-private-host>
CRM_DB_NAME=<DBA-approved-database>
CRM_DB_USERNAME=<readonly-server-principal>
CRM_DB_PASSWORD=<secret-manager-reference>
CRM_DB_SSL_MODE=<approved-TLS-policy>
PIS_AUTH_SESSION_SECRET=<secret manager reference>
SUPERSET_BASE_URL=https://superset.internal.example
SUPERSET_SERVICE_ACCOUNT_SECRET=<secret manager reference>
```

Use `.env.example` as a template, never commit `.env.local` or actual credentials. Production host must support Next.js Node/server runtime and protected Route Handlers, not static-only output. Use private/no-store on sensitive responses. See `18_ENV_AND_OPERATIONS.md`.

## 12. Engineering validation

- Next.js route/layout tests and direct protected deep links.
- RSC and browser navigations under switched sessions and regions (no stale confidential data).
- Date/Product filter propagation and manager selected RO scope across KPIs, reports and Superset.
- MTD and YTD product mix donut from **investment amounts**, summing to approved denominator.
- Monthly inflow/outflow/closing position reconcile to approved ledger and business cutoffs.
- Superset SDK import never runs on the server; scoped guest tokens cannot widen access.
- Removed routes/buttons/charts absent, forbidden pages never leak data in response payloads.
- Keyboard navigation, accessible table labels, 1440/1280/1024/mobile viewports, and error/loading states.

## 13. Implementation sequence

1. Inspect existing Next.js version, App Router folder convention, auth, **actual CRM database schema and approved SQL calculation views**, region/RO permission model and self-hosted Superset availability; record missing dependencies.
2. Create route group layouts and protected server session/scope helpers.
3. Implement global top filter, canonical URL parsing, scope resolver and BFF layer.
4. Implement RO dashboard, then Regional Manager dashboard, using deterministic synthetic data with clear demo labels.
5. Integrate secured self-hosted Superset embedding against approved calculation views and ensure date/region/RO/product parity.
6. Build portfolio movement ledger, portfolio/customer/investment details, approved targets, profitability, reports, and maturities.
7. Complete QA, RLS, performance, WCAG and design review, and document unresolved business-rule sign-off.

## 14. Out-of-scope guardrail

Do not implement Account Opening (including today/MTD/YTD accounts), daily activity widgets, standalone Product Performance ranking, status-based performance scorecards, unapproved banking transactions, guessed finance formulas or admin/executive screens. The latest boss notes control functional scope; user-confirmed Next.js controls frontend architecture.
