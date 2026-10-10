# Revised Screen Specifications and Wireframes

**Current visual reference:** polished enterprise financial product; previous generated mockups provide style cues only. Do **not** reproduce their removed account-opening content, Recent Activity areas, performance product breakdown or Status badges. Every analytical board places the **global filter bar immediately below the title**.

## S00 — Login `/login` (P0)

**Purpose:** authenticate user and route to role-specific home.

**UI:** split-screen at desktop; left burgundy-to-red PIS branding inspired by Sterling Bank Nigeria, subtle abstract architectural/financial motif, concise purpose statement; right compact white sign-in surface with staff ID/email, password, reveal-password, sign in, help/forgot-password as identity provider supports; footer security/accessibility notices. Prefer no grandiose sales copy. Responsive small screens hide decorative pane.

**Flow:** submit → backend auth → receive permitted identity+roles+regions → RO or Regional Manager dashboard. Invalid credentials, expired session, rate limits and network failures have distinct accessible messages. Do not show Microsoft SSO button unless provisioned by identity provider.

## S01 — RO My Dashboard `/ro/dashboard` (P0)

**Primary question:** What is my portfolio now, how has it moved monthly, how far from target, and what must I do?

**Top:** page title `My Performance`, data refresh/as-of info; **Region (locked) | RO (locked) | Date | Product | Apply / Reset**.

**KPI strip (first row):** Current Portfolio (point-in-time), Annual Position Target, Achievement %, Remaining Gap, Required Monthly Pace, optional approved Daily Pace numeric only (not daily chart). Distinct timestamp and currency.

**Charts (Superset):**
1. `Monthly Portfolio Movement` — signed net external movement bars, optional closing-position line where common scale is appropriate; otherwise use two coordinated charts. Tooltip opening position, inflows, withdrawals/liquidations, adjustments, closing position.
2. `Position vs Target (monthly)` — monthly closing-position and *period-appropriate* target line; do not use annual target as implied monthly target without approved allocation.
3. `Product Investment Mix — MTD/YTD` — donut by eligible investment amount. Clearly label denominator and rollover policy.
4. Optional `Monthly Interest Income / Expense` line or bars, if approved.

**Below charts:** compact monthly portfolio movement ledger and `See Portfolio` / `Profitability` navigations. **No:** accounts opened today, account-opening summary, Recent Activities, product-performance ranking, dashboard status.

## S02 — Portfolio Movement `/ro/portfolio-movement`, `/regional/portfolio-movement` (P0)

**Top filters:** Region | RO | Date | Product.

**KPIs:** Starting Position, New External Inflow, Withdrawals / Liquidations, Net External Movement, Closing Position, Reconciliation Adjustment (only where used).

**Charts:** monthly signed positive/negative movement waterfall *only if Superset deployment supports it reliably*, otherwise diverging grouped/stacked bars for signed flows plus line for end-of-month position. Granularity is **month**, not day. A monthly detail table follows, with drilldown into permitted deals.

**Ledger table:** Month; opening; new inflow; external outflow; recognized change from accrual/valuation if configured; adjustments; closing; net change; data as-of; source reconciliation flag displayed here only if operationally necessary and signed off.

**Important:** rollovers/renewals are retention, not automatic external inflows, unless officially defined otherwise. See KPI docs.

## S03 — My Portfolio `/ro/portfolio`, `/regional/portfolio` (P0)

**Header/top filters** consistent. **Cards:** total position, customer count, investment count, target gap, WACC where approved. **Tables:** positions by assigned customer/deal, principal/current balance, maturity, authorized product, currency. **Chart:** month-end position trend (Superset) and optionally investment mix donut reused rather than duplicate performance-breakdown. **No** performance-ranked product cards or status scoreboards.

## S04 — My Customers `/ro/customers`, `/regional/customers` (P0)

**Filters up top** then local search. Columns: Customer ID; Customer Name; Customer Type; Assigned RO (for manager), Product(s), Current Portfolio Position, Relationship Since; `View`. Use effective-dated attribution at reporting date. Hide account-opening CTA. Customer count is count of distinct eligible customers, not sum of monthly snapshots.

**Customer detail** `/.../customers/:customerId`: identity/assigned RO context, current position, investment/deal list, relevant profitability, product associations, assignment history (read-only), selected date. Optional tabs: Overview, Investments, Transactions, Relationship History. Compliance/Documents tabs were historic design exploration and need separate scope approval.

## S05 — Investments & Deals `/ro/investments`, `/regional/investments` (P0)

**Top filters** then local search by deal ref/customer. Columns: Deal ID; customer; RO (manager), product; new inflow/rollover; transaction amount; customer rate; pool rate; effective date; maturity date; calculation base (if authorized), current position, link to detail. Avoid Status column unless specifically approved for operational pages. Pagination and export with policy.

**Detail** `/.../investments/:investmentId`: basic information; principal/inflow, effective date, tenor, maturity; rates; calculation base (with unconfirmed-definition warning), weight/WACC contribution; reporting cut-off, days; interest income/expense, deal/management margins, WHT/OPEX where approved; linked rollover history. Show `Pending business definition` for unresolved KPIs rather than fabricate them. Read-only by default.

## S06 — Profitability Analysis `/ro/profitability`, `/regional/profitability` (P1)

**Top filters** always visible. **KPI cards:** Interest Income, Interest Expense, Deal Margin, WHT, Management Margin, OPEX, Final Profitability, WACC, Pool Rate / Spread as permitted. **Charts:** monthly income and expense bars, monthly profitability trend, region/RO profitability comparison for manager (not product performance by product). **Table:** RO, customer, deal, product, base, rates, applicable days, income, expense, margin, WHT/OPEX/profit; sortable/filterable. Clearly separate deal margin vs MPR management margin.

## S07 — My Targets & Run Rate `/ro/targets`, `/regional/targets` (P0/P1)

**Top filters**. Target = approved annual or period-relevant target; gap and achievement; monthly pace = approved remaining target / remaining months. Monthly actual vs approved monthly allocation chart (no annual target repeated as monthly). Region view shows per-RO target+achievement columns **without status**. No editing budgets in current frontend.

## S08 — Maturities & Rollovers `/ro/maturities`, `/regional/maturities` (P1)

**Top filters** plus optional maturity horizon (this month / next month / custom). **Cards:** maturing this month, rollover principal, matured without rollover, liquidity exposure, all clearly scoped and definition-backed. **Table:** customer, deal, product, principal, maturity date, month, linked rollover reference, recognized outflow where applicable. No fake renewal action unless authorized. Not a daily status dashboard.

## S09 — My Reports `/ro/reports`, `/regional/reports` (P1)

**Top filters** followed by report templates: Portfolio Movement, RO Position vs Target, Profitability, Investment/Maturity/Rollover, Regional RO Comparison (manager only). Reuse common report viewer: heading, applied scope, metrics, Superset analytic section when appropriate, read-only exportable detail table. **No Account Opening Report**. Export must match the filtered on-screen period and scope.

## S10 — My Profile `/profile` (P1)

Display name, staff ID, role, regions/team, reporting manager if in identity service, preferences (theme, locale), security links. Profile edits should target identity provider or approved account API; do not expose unsupported password reset flows.

## S11 — Regional Manager Dashboard `/regional/dashboard` (P0)

**Primary use:** see performance for **one authorized selected region**, optionally filter a specific RO or All ROs. At top: title `Regional RO Performance`, subtitle showing selected region and reporting month; **Region | RO | Date | Product**.

**KPI strip:** Regional Closing Portfolio; Region Target; Target Achievement; Gap; Regional Monthly Net Movement; Required Monthly Pace; Regional Profitability (if available).

**Superset visual layout:**
- `Regional Monthly Portfolio Movement`: diverging monthly net movement columns and portfolio closing trend line in separate aligned panels if units/scales differ.
- `RO Position vs Target`: sorted horizontal grouped bars for closing portfolio and approved period target, or percentage-achievement sorted horizontal bars **plus exact value tooltip** (no performance badge).
- `RO Shortfall vs Required Pace`: sortable **table** preferred over dual-axis chart; optional horizontal bar ranking by target gap.
- `Product Investment Mix MTD/YTD`: donut, within region/RO/product filters; composition not product performance.
- `Monthly Profitability by RO`: optional aligned positive/negative bars if approved.

**Regional RO table:** RO; team/branch; portfolio; target; achievement; gap; monthly net movement; monthly required pace; WACC (reweighted); profitability. **No Status column**. Row click goes to the selected RO's authorized overview; manager can return to All ROs.

## S12 — Regional RO Comparison/Detail `/regional/relationship-officers`, `/:roId` (P0)

**Manager-only.** Filters first, table of scoped officers then selected RO's dashboard, scoped to region. Product/date selections carry forward; view-only. Regional manager should not see an RO after that RO's region assignment ends except through approved historical-as-of permissions.

## Mini wireframe — Regional dashboard

```
[ PIS SIDEBAR ] [ Regional RO Performance              user      ]
                [ Region▼ ][ RO: All▼ ][ Date▼ ][ Product▼ ] [Apply]
                [ Portfolio ][ Target ][ Achievement ][ Gap ][ Net Move ]
                [ Monthly Region Movement ] [ Closing Position Trend ]
                [ RO Position vs Target    ] [ Investment Mix MTD|YTD ]
                [ RO Comparison Table: RO | Portfolio | Target | Gap | Pace ]
```

## Mini wireframe — RO dashboard

```
[ PIS SIDEBAR ] [ My Performance                         user ]
                [ Region🔒 ][ RO🔒 ][ Date▼ ][ Product▼ ] [Apply]
                [ Current Portfolio ][ Target ][ % ][ Gap ][ Pace ]
                [ Monthly Portfolio Movement (Superset) ]
                [ Closing Position vs Target (Superset) ]
                [ Product Investment Mix: MTD | YTD    ]
                [ Month-by-month movement ledger       ]
```

## Shared critical states

- `No data for period`, `No approved KPI`, `Calculations pending`, `Superset unavailable`, `Forbidden region/RO`, `Export unavailable`, `Period contains provisional month`, `As-of date outside history`.
- All destructive edits out of scope; no interactive controls without real action.
- Use consistent date, currency, missing-value, negative-value and percentage formatting.

## CRM-backed screen content and data-ownership note

RO Directory, Customers, Portfolio, Investments and detailed screens display verified records from **existing CRM tables through server-side read-only queries** (actual schema TBD). Financial KPI cards and charts use the **approved SQL calculation/reporting views**, not a separate KPI service. Missing columns or view definitions produce explicit unavailable states, not invented amounts. Earlier screenshot buttons such as Add Customer, New Investment, Open Account, Upload Documents or Edit must not become working CRM mutations. `23`–`26` define the integration boundary.
