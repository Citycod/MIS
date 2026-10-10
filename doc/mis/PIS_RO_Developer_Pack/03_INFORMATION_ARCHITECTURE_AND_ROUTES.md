# Information Architecture, Routes and Navigation

## Navigation — Relationship Officer

```
PIS
├─ My Dashboard                 /ro/dashboard
├─ Portfolio Movement           /ro/portfolio-movement
├─ My Portfolio                 /ro/portfolio
├─ My Customers                 /ro/customers
│  └─ Customer Details          /ro/customers/:customerId
│     └─ Accounts/Investments   /ro/customers/:customerId/:tab
├─ Investments & Deals          /ro/investments
│  └─ Investment Details        /ro/investments/:investmentId
├─ Profitability Analysis       /ro/profitability
├─ My Targets & Run Rate        /ro/targets
├─ Maturities & Rollovers       /ro/maturities
├─ My Reports                   /ro/reports
│  └─ Report Viewer             /ro/reports/:reportKey
└─ My Profile                   /profile
```

## Navigation — Regional Manager

```
PIS
├─ Regional Dashboard           /regional/dashboard
├─ Portfolio Movement           /regional/portfolio-movement
├─ RO Performance               /regional/relationship-officers
│  └─ RO Overview               /regional/relationship-officers/:roId
├─ Regional Portfolio           /regional/portfolio
├─ Customers                    /regional/customers
│  └─ Customer Details          /regional/customers/:customerId
├─ Investments & Deals          /regional/investments
│  └─ Investment Details        /regional/investments/:investmentId
├─ Profitability Analysis       /regional/profitability
├─ Targets & Run Rate           /regional/targets
├─ Maturities & Rollovers       /regional/maturities
├─ Regional Reports             /regional/reports
└─ My Profile                   /profile
```

**Login** `/login`, **session expired** `/session-expired`, **403** `/forbidden`, **404** via `app/not-found.tsx`.

## Never expose in revised navigation

`/account-opening`, `/accounts/open-new`, `/daily-performance`, `/product-performance`, onboarding approval, account-opening report, admin/manager executive screens from earlier concepts. Redirect legacy links to removed-feature explanatory 404 (not to an active wizard).

## Next.js App Router route conventions

The URLs above are **public route patterns** and remain unchanged in the Next.js migration. Implement them with `src/app/(workspace)/ro/.../page.tsx`, `src/app/(workspace)/regional/.../page.tsx`, and named dynamic folders such as `[customerId]`, `[investmentId]`, `[reportKey]`, `[roId]`. `src/app/(auth)/login/page.tsx` maps to `/login`; `(auth)`/`(workspace)` are pathless groups. Use `next/link` and `next/navigation`; **never install React Router**. The private shell is a workspace `layout.tsx`; source data and role permissions are checked on server before serving every protected page. See `21_NEXTJS_APP_ROUTER_IMPLEMENTATION.md`.

## Consistent page composition

```
┌────────────────────────────────────────────────────────────┐
│ Topbar: search │ help │ last refresh │ notifications? │ user│
├────────────────────────────────────────────────────────────┤
│ Breadcrumb / title / context action                         │
│ GLOBAL FILTERS: Region | RO | Date | Product | Apply | Reset │
│ Active scope + date coverage notice                         │
├────────────────────────────────────────────────────────────┤
│ KPI cards: current portfolio • target • gap • pace           │
├────────────────────────────────────────────────────────────┤
│ Monthly portfolio movement / Superset                       │
│ MTD | YTD product INVESTMENT mix donut / Superset            │
├────────────────────────────────────────────────────────────┤
│ Authorized detail / transaction or report table             │
└────────────────────────────────────────────────────────────┘
```

## Filter/route contract

- Canonical query params: `regionId`, `roId`, `from`, `to`, `productId`, `period=MTD|YTD|CUSTOM`, `asOf`.
- Region and RO values for an RO are **locked** to server session; URL attempts to alter are rejected/ignored and logged.
- Manager region defaults to primary assigned region; RO defaults to **All ROs in region**.
- Product defaults to All Products, date defaults to current reporting month or YTD by page; show exact effective cut-off.
- `regionId` change clears currently selected `roId` if it is no longer in that region.
- Click from manager comparison to RO details carries `regionId`, `roId`, `period`, dates and product; Back restores regional view.
- Filter selection must not grant access; backend normalizes permitted scope.

## Board versus operational pages

- **Board:** overview/analytics page with four common top filters; includes read-only KPIs and charts.
- **Operational page:** customers, investments, maturities and reports also show the same filter strip at top when filtering data, plus local search/row-specific controls in their respective sections.
- Export must include a filter manifest and as-of timestamp; use a server-authorized export.

## Scope of UI actions

- Read-only details are P0; actions `Add Customer`, `New Investment`, `Renew`, `Top-up`, `Early Closure`, `Edit`, `Upload` should **not render as working options until separately approved**.
- In prototype mode, visually omit unapproved actions instead of creating misleading success toasts.

## CRM database navigation and record authorization boundary

Customer, RO and investment detail routes are **read-only PIS views of records stored in existing CRM tables**, queried by a server-only database repository with authorized predicates. Route IDs must be validated against session-bound RO/region scope before accessing records. Financial figures come from approved SQL views. No new source CRM create/renew/onboard/edit routes merely because historical mockups depicted them. Direct database integration changes data access, **not** public routes or monthly/regional navigation.
