# Change Control, Scope and Interpretation

## Precedence

The boss's latest review instructions **supersede older prompts and older images** where they conflict. The initial document remains valid for customer assignment history, profitability, portfolio and investment calculations **except** that UI features explicitly removed from this release must stay out.

## Review instructions — change matrix

| Review wording (edited only for formatting) | Final implementation interpretation | Confidence / action |
|---|---|---|
| “REMOVE DAILY ACCOUNT OPENED PERFORMANCE(TODAY) ITS MONTHLY PERFORMANCE STUFF, MTD AND YTD.” | Remove accounts-opened-today and all daily account-opening visuals. Ultimately remove account opening from this release altogether. Monthly, MTD, YTD refer to remaining portfolio/investment performance. | High for removal; period semantics to confirm. |
| “IT SHOULD BE PORTFOLIO MOVEMENT” | Replace daily-performance/account-opening focus with **monthly portfolio movement**: opening position, external inflows, outflows/liquidations, net movement, closing position, target and pace. | High; classification rules pending. |
| “FILTER--” / “FILTER SHOULD BE UP” | Shared filter strip **directly below the page header, above cards and charts**; never bury filters below charts. | High. |
| “NO BREAKDOWN OF THE PRODUCT BASED ON PERFORMANCE” | Remove standalone Product Performance dashboard, product target/actual ranking and product profitability leaderboards in current release. | High. |
| “REMOVE STATUS” | No status KPI, status-based RO rating, status column, or green/red status badges on analytical dashboards and RO comparison. Back-end lifecycle status may exist; whether it should be shown in operational transaction lists is open. | Interpretation; sign-off needed. |
| “REMOVE RECENT ACTIVITY CHART” | Remove Recent Activity panel/chart/list from landing dashboards. Keep transaction history in dedicated deal/customer details for audit and drilldown. | High. |
| “DONUT CHART THAT SHOW BREAKDOWN OF THE PRODUCT YTD AND MTD,INVESTMENT.” | Retain **one product investment mix donut** with MTD/YTD switch; categories are products, measure is explicitly defined eligible investment amount, not product performance. | High; denominator and rollover treatment to confirm. |
| “THEY SHOULD BE MONTHLTY” | Use month-grain chart x-axes; YTD displays Jan–current month, MTD shows current-month aggregation/as-of snapshot. No daily trend charts in current build. | Proposed precise semantics; confirm. |
| “REMOVE ACCOUNT OPENING” | Hide/remove account-opening page, menu, wizard, funnel, card, report, KPIs and workflow in this release. Preserve original requirement in backlog until business resolves conflict. | High for present release. |
| “REGIONAL MANAGER SHOULD BE ABLE TO SEE AND FILTER ALL THE RELATIONSHIP OFFICER UNDER THEM.” | Add **Regional Manager** role and dashboard with access only to assigned region(s), all assigned ROs and region-constrained aggregates/drilldowns. | High; multi-region assignment needs confirmation. |
| “FILTER FOR REGION, RO,DATE,PRODUCT SHOULD BE AVAILBLE ACROSS ALL BOARD.” | Four universal board filters in a common top strip. ROs see assigned RO and region as **read-only locked** controls; managers see permitted region and RO selector. | High with role-specific interpretation. |
| “DASHBOARD FOR RELATIONSHIP OFFICER PERFORMANCE FOR THATR PPARTICULAR REGIION, DETERMINE THE CHART TO BE USED” | Regional Manager dashboard with monthly regional movement, RO position vs target, ranked gap/required pace, and region-filtered investment mix; chart designs in `09`. | High. |

## What to REMOVE from the older chat's designs

- **Account opening in its entirety:** Today, MTD, YTD, screens, create-new-account wizard, approval journey, account-opening funnel, account-opening performance reports, accounts-opened nav.
- **Daily Performance menu/page** as a dashboard; replace with **Portfolio Movement (Monthly)**. No daily bar/line charts. Daily run-rate *numeric KPI* remains only if approved and useful; it is not an account-opening metric.
- **Standalone Product Performance** page and product target-vs-actual/RO-by-product scoreboards. Product selection in global filters and investment composition donut remain.
- **Recent Activities** feed on landing dashboards.
- **Status** labels in dashboard scorecards and RO performance comparison.
- Old screenshot content implying investment approvals, compliance controls and account opening are settled production scope.

## What to KEEP / ADD

- Login, RO My Dashboard, My Portfolio, My Customers and customer details, Investments & Deals and investment details, Profitability Analysis, My Targets & Run Rate, Maturities & Rollovers, My Reports, My Profile.
- New **Portfolio Movement** screen (monthly).
- New **Regional Manager Dashboard**, **Regional RO Directory/Comparison** and drilldown into a selected RO.
- Global **Region | RO | Date | Product** filters **above the content** in every board, with security scope enforced server-side.
- Apache Superset for all chart visuals; finance-approved database SQL views for numeric logic.
- Investment product-mix donut switchable between **MTD** and **YTD**.

## Product-scoping guardrails

1. “Remove account opening” is treated as **remove from the current frontend release**, not delete historical source data or rework core banking source integrations.
2. “No product performance breakdown” does **not** prohibit displaying product names, a product filter, or the explicitly requested **investment allocation donut**.
3. “Remove status” is interpreted narrowly for performance dashboards; do not indiscriminately delete database deal lifecycle flags. Clarify operational status display before implementing investment lists.
4. A regional manager with one region must not be able to broaden scope to another via URL, filters, exported reports or Superset guest tokens.
5. The original client source has no explicit regional-manager role. This is **new scope from boss review**.

## Sign-off gates

- Product owner accepts the revised information architecture and exact removal scope.
- Data owner defines region hierarchy and RO effective-dated memberships.
- Finance approves movement reconciliation, investment composition denominator and rollovers treatment.
- Security approves region and RO authorization across both API and Superset.
- BI approves MTD/YTD time semantics, chart measures and drilldown implementation.

## Confirmed implementation platform — 09 October 2026 user clarification

The user explicitly confirmed **Next.js** as the frontend tech stack after the first pack was produced. This supersedes the pack's earlier default React+Vite+React Router recommendation; it does **not** change the boss's functional-scope revisions. Use **Next.js App Router, TypeScript, Tailwind/shadcn**, protected Server Components and Route Handlers, with Superset Embedded SDK in client-only leaf components. See `07`, `16`, `18`, and `21`.


## Latest visual branding revision — 09 October 2026

The user subsequently clarified that the color palette should resemble **Sterling Bank Nigeria**, superseding the earlier blue/navy mockup theme for visual styling. Use **red / charcoal / white / warm-neutral** tokens from `06_DESIGN_SYSTEM.md` and `22_BRAND_DIRECTION_AND_HANDOFF.md`. This is **not** an official Sterling brand guide and should not be treated as a license to use their logo. The functional scope above remains unchanged.

## 2026-10-09 integration decision — existing CRM API

**Superseded by 2026-10-10 database decision below.** Do not implement the CRM API or a separately required KPI service.

## 2026-10-10 final integration decision — existing CRM database and SQL views

**Confirmed by the project owner:** PIS connects **directly to the existing CRM database**, from trusted server infrastructure only. Existing CRM tables are the source for customers, ROs, products and deals where available. **All financial calculations reside in approved database views**. Apache Superset is installed/self-hosted and connects to approved reporting views as the analytics service. The prior 09 October “CRM API + separate KPI service” design is withdrawn.

**Unchanged:** the monthly-first boss UI revision; Account Opening, Daily Performance and Product Performance scorecards removed; Regional Manager authorized region scope; four top filters; product investment **MTD/YTD composition donut**; no recent activity/status indicators; Next.js and Sterling-inspired brand palette.

**No direct browser DB connection:** a read-only Next.js Node-server query layer and independently scoped, read-only Superset database account are required. No actual database engine, table names or view names have been provided. Complete `24_CRM_DATABASE_SCHEMA_AND_VIEW_MAPPING.md` before writing production SQL. Read `23`, `25` and `26`.
