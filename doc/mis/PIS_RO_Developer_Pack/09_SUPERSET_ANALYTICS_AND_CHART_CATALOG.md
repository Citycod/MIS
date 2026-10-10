# Apache Superset Integration and Chart Catalog

## Mandatory architecture

`Existing CRM database tables → DBA/Finance-approved SQL calculation/reporting views → Apache Superset (self-hosted, independent read-only DB principal) → securely embedded in a Next.js browser-only Client Component`. Next.js server also queries these same authoritative views for KPI cards and scoped reports.

KPI rules **must live in approved database SQL views**, never only in Superset chart configurations or Next.js/UI computations. Next.js UI components cannot manufacture authoritative aggregates. All charts below are proposals based on current product direction, with metric definitions from `08`.

## Embedding: verified official baseline

Use `@superset-ui/embedded-sdk` with `embedDashboard({ id: embeddedDashboardUuid, supersetDomain, mountPoint, fetchGuestToken, dashboardUiConfig })`. Superset needs `EMBEDDED_SUPERSET` enabled and allowed dashboard embedding origins; a trusted backend issues guest tokens through Superset's `/api/v1/security/guest_token/`. The browser never holds service-account/admin credentials. Tokens must expire and refresh, and backend-supplied RLS must restrict region/RO/product where appropriate.

**Official docs:**
- https://superset.apache.org/user-docs/using-superset/embedding/
- https://superset.apache.org/developer-docs/api/get-a-guest-token/
- https://superset.apache.org/developer-docs/api/schemas/guesttokencreate/

Pin the exact Superset deployment/version and retest native-filter or external-controller behavior before promising filter synchronization. Different versions have different capabilities; do not assume general direct parent↔chart event hooks. The authoritative source for filters remains the application filter contract plus backend scope.

## Dashboard registry — logical keys (NOT real Superset IDs)

| Logical dashboard key | Route(s) | Charts |
|---|---|---|
| `ro_overview` | `/ro/dashboard` | R01, R02, R03, R04 optional |
| `regional_overview` | `/regional/dashboard` | G01–G05 |
| `portfolio_movement` | both movement routes | M01, M02 |
| `portfolio` | RO/regional portfolio | P01, P02 |
| `profitability` | profitability | F01, F02, F03 |
| `targets` | targets | T01, T02 |
| `investment_mix` | reused in several views | I01 |
| `maturities` | maturities | U01 |

Actual dashboard UUIDs stored in environment-driven/server-delivered registry; enable embedding, configure explicit allowed origins.

## Mandatory chart inventory

| ID | Audience | Title | Recommended type | Exact semantic input | Notes |
|---|---|---|---|---|---|
| **R01** | RO | Monthly Portfolio Movement | Diverging grouped bars | monthly new external inflow / external outflow / net | Include signed axes, 12 months max in YTD. |
| **R02** | RO | Month-End Portfolio vs Target | Line(s) or grouped bar | monthly closing position + approved period target | Avoid mixing annual target into monthly axis without allocation. |
| **R03/I01** | RO+Region | Product Investment Mix (MTD/YTD) | Donut | eligible investment amount by product | **Not** product performance; selector MTD/YTD, center total, 5–6 slices. |
| R04 | RO | Monthly Profitability Trend | Line | approved monthly profitability | Omit until signed off. |
| **G01** | Region | Regional Monthly Net Movement | Diverging bar | aggregate net external movement monthly | One region filter; all authorized ROs or selected RO. |
| **G02** | Region | Regional Closing Portfolio Trend | Line | region month-end closing position | Separate graph/scale from flows if different units. |
| **G03** | Region | RO Position vs Target | Horizontal grouped bar | each RO closing position and period-appropriate target | Sort gap/achievement; no status badges. |
| **G04** | Region | RO Target Gap | Horizontal bar | RO remaining gap | Top N with exact labels, no opinionated “good/bad” status. |
| G05 | Region | Monthly Profitability by RO | Horizontal +/- bar | approved profitability | Optional pending accounting sign-off. |
| M01 | Both | Portfolio Movement Components | Signed bar or approved waterfall plugin | opening + components + closing | If waterfall visualization unavailable, use bars + reconciled table. |
| M02 | Both | Monthly Portfolio Closing Position | Line | month-end position | For year comparison show month names with year. |
| P01 | Both | Historical Portfolio Position | Line | approved snapshots | Not sum of months. |
| P02 | Both | Portfolio by RO | Horizontal bar | ending position per RO | Manager only; RO does not require a one-bar chart. |
| F01 | Both | Monthly Interest Income vs Expense | Grouped bars | income, expense | Show NGN, negative values carefully. |
| F02 | Both | Profitability Trend | Line | final profitability | Only if formula approved. |
| F03 | Region | RO Profitability Comparison | Horizontal +/- bar | per-RO profitability | No product performance. |
| T01 | Both | Monthly Position Target vs Actual | Grouped bars | approved month target and closing actual | Granularity month. |
| T02 | Both | Run Rate / Remaining Gap Over Months | Line(s) or table | gap and required pace | Distinct units not forced onto a single axis. |
| U01 | Both | Investment Maturity Schedule | Monthly columns | maturing principal by month | Rollover separate overlay only if semantics approved. |

## Charts explicitly prohibited in this release

- Daily account-opened/Today/MTD/YTD account-opening charts or funnel.
- Daily performance activity chart and daily trend as main board.
- Product performance target-vs-actual charts, product profit ranking or standalone product performance page.
- Recent Activity charts/feed on overview boards.
- Status distribution chart, RO red/green status flags.

## Filter and embedding contract

Top application bar: `Region | RO | Date | Product`. Backend returns **normalized effective scope** (regionIds, allowedRoIds, effective period, product scope) and `scopeToken`/snapshot metadata; no trust in unvalidated filter IDs.

**Preferred integration approach** (choose after version spike):
1. Create region-safe datasets and immutable role-safe view definitions.
2. Authenticate embedding through backend guest tokens using row-level clauses generated only from authorized region/RO membership.
3. Establish the default dashboard filtering via supported Superset native-filter state or explicit URL/SDK mechanism **tested on the pinned version**; remount dashboard when context changes if needed.
4. Cross-filtering remains internal to Superset where enabled. Application drilldowns must be explicit, tested app actions, not assumed iframe events.
5. If external dynamic filters cannot be reliably synchronized: serve versioned, prefiltered reporting views or a secure approved backend dashboard manifest/crossfilter integration; clearly indicate filter syncing as a blocker—never show mismatching visuals.

**Do not rely only on frontend hiding or client query parameters for RLS.**

## Data parity rules

- Cards and Superset charts use the exact same approved semantic definition IDs and reporting snapshot version.
- Manager total = eligible RO/deal sum, subject to deduplication, dates and currency; WACC must be reweighted from numerator/denominator.
- Donut slices sum to 100% of selected eligible investment denominator after same product/RO/date/region filters.
- Closing position is a snapshot, not sum of monthly positions.
- If a month is incomplete, render `MTD / provisional` in tooltip and top context bar.

## Operations / loading

- One or a few cohesive embedded dashboards per page, not one iframe per tiny card.
- Skeleton while loading; independent error surface with Retry; report ID or correlation ID if available; do not block KPI cards.
- Explicit error logging for token fetch, CSP/frame origin, forbidden dataset, Superset query errors, filter-sync mismatch and expired token.
- Configure frame ancestors / embed allowed origins, TLS, cache isolation and dataset permissions.
- Avoid exporting Superset data from browser if app report endpoint cannot enforce the same row scope.

## Superset implementation definition of done

- A RO cannot view another RO in embedded charts via URL/filter tampering.
- Regional manager cannot view other regions.
- Changes to all four filters are reflected in numbers, Superset and exports.
- MTD/YTD donut changes as specified and uses exact denominator.
- No removed chart exists in BI dashboard registry.
- Charts cite dataset and metric/version metadata for debugging.


## Visual palette update — Sterling Bank Nigeria–inspired

Use PIS brand red `#CF2E2E` selectively for chart highlights; charcoal text `#333333`, white chart surfaces, warm-neutral grids, and the categorical chart palette defined in `06_DESIGN_SYSTEM.md` / `22_BRAND_DIRECTION_AND_HANDOFF.md`. Configure this color scheme **inside Superset**, not just in parent Next.js CSS. Render positive and negative movement with explicit signs and axis orientation so the brand red is not confused with negative financial status. Prior blue screenshots are no longer the palette reference.

## Approved CRM SQL views as authoritative Superset datasets (10 October)

**Updated decision (10 Oct 2026):** Superset is a **self-hosted separate service** and should connect, through a limited read-only database account, to **DBA/Finance-approved CRM calculation/reporting SQL views** (or an approved read replica exposing those same signed-off views). There is **no CRM REST API extraction pipeline or separate KPI service** required by the current specification. Physical object names/driver/grain must be discovered with the DBA (`24`) and signed off before connection. Direct Superset access to unrestricted raw CRM tables is not approved. The bank must review view grants, native/BI row-level security, embed guest-token rules, data cutoffs and matching KPI/BI definitions. Refer to `26_SUPERSET_SELF_HOSTED_SETUP.md` for download/install and connection guidance.
