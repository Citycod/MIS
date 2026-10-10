# Product Requirements — Revised RO / Regional Manager

## Product purpose

A region-aware performance system helping Relationship Officers and their Regional Managers answer: *What is our portfolio position? How has it moved by month? What are the targets and shortfalls? What do our investments and product mix look like MTD/YTD? How profitable is the book? What pace is required?* The original document defines the RO as linked to assigned customers, products, investments/transactions, targets and budgets (source pp.1–4); the boss changed emphasis from daily/account opening to **monthly portfolio movement**.

## Actors

- **RO:** view **own** records, assigned customers/deals, own financial and portfolio performance; locked region/RO scope.
- **Regional Manager:** view own authorized region(s), filter by any RO assigned to that region for the selected as-of date, compare ROs, drill down to customer/deal where permitted.
- **Platform service:** issue authentication, authorization, source imports, KPI datasets, Superset dashboard tokens. No admin UI in current release.

## P0 stories and measurable acceptance

| ID | As a... | I need... | Acceptance |
|---|---|---|---|
| RO-01 | RO | Sign in securely | Valid login reaches my dashboard; invalid session cannot view data. |
| RO-02 | RO | See the period and active filters | Region, RO, Date, Product controls appear **before KPI cards**; first two fixed to my authorized scope. |
| RO-03 | RO | See position, annual target, achievement, gap and required pace | KPI values use same approved reporting cut-off; undefined zero-denominator handled. |
| RO-04 | RO | See month-by-month portfolio movement | Monthly chart, opening/closing balance and movement components reconcile to approved movement ledger. |
| RO-05 | RO | See product investment mix MTD and YTD | Donut explicitly measures eligible investment amount, uses selected filters, MTD/YTD switch, click through only when documented. |
| RO-06 | RO | Inspect my customer portfolio and deals | Search, filter, paginated list, authorized detail links; no unauthorized data. |
| RM-01 | Manager | Select my authorized region and its ROs | Region list authorized only; RO list updates with region/effective date. |
| RM-02 | Manager | Compare ROs in a region | Region-scoped position, target, gap, achievement and profitability; no performance status badge. |
| RM-03 | Manager | Drill from regional overview to RO | Filtered RO page preserves context and cannot escape assigned region. |
| BI-01 | BI/user | See Superset analytical charts | Embedded securely, in alignment with page filters, with readable loading/error states. |
| SEC-01 | Security | Prove isolation | Tampered IDs in route, query, API body, Superset token and exports cannot expose outside-scope rows. |

## P1 stories

- **RO-07:** Profitability breakdown (interest income, expense, WHT where approved, deal/management margin, OPEX, profitability), with approved metric definitions.
- **RO-08:** Monthly inflow and rollover analysis, maturation and liquidation impact clearly classified.
- **RO-09:** Historical snapshots and side-by-side prior month/period views (no mixing monthly snapshots and event totals).
- **RM-04:** Regional trends and RO comparison by monthly closing portfolio and shortfall; authorized export.
- **REP-01:** My Reports/Regional Reports with period and filters, PDF/CSV/XLSX only when backend export exists.

## Non-functional requirements

- Responsive desktop-first, target 1440/1280/1024px, graceful mobile.
- WCAG 2.2 AA relevant success criteria; meaningful keyboard navigation and table headers.
- Format currency `NGN` by default for mock data; currency must always come from record/report context; no silent conversion.
- Consistent query semantics between API cards, report tables, and Superset charts.
- Financial calculations **not** duplicated independently in React or only in Superset SQL charts.
- Historical RO→customer and RO→region assignment changes preserve financial attribution.
- No misleading mock values: label synthetic environments; immutable seeded fixture data.
- Responsive skeletons, empty, forbidden, expired session, partial data and failed embeds.
- No account-opening route/KPI/report; deep links into removed routes return safe not-found/feature unavailable.

## Success criteria for review

1. RO home can be understood within a quick scan, with **movement**, position, target and remaining gap prominent.
2. Manager can select region+RO+month/product and see scoped results consistently.
3. Product mix donut toggles MTD vs YTD without becoming a product performance ranking.
4. All charts use Superset or an explicit chart-unavailable state (never locally fabricated chart visuals).
5. A reviewer cannot find Account Opening, Daily Accounts Today, Recent Activity, Product Performance, or dashboard Status fields.

## Explicit exclusions / dependencies

- User, product, customer, pool-rate, budget and OPEX **administration** UI excluded; backend setup can still exist.
- Mutating investments and customer records is **not assumed** for an RO; all forms require business authorization. Historical screen mockups showing edit/new actions are visual explorations only.
- Source-system reconciliation, day-count, WHT, Calculation Base, OPEX, partial withdrawal, liquidation and rollover policy require sign-off (see `15`).

## Latest integration decision — direct CRM database + SQL views (10 October 2026)

**Superseded 10 October:** PIS uses the existing CRM **database**, read from Next.js server infrastructure, and approved SQL views for **all calculations**. No CRM API adapter or separate KPI microservice is in scope. Source operational tables and approved reporting views are discovered/approved with DBA and Finance before live wiring (`23`–`25`). RO and Regional Manager views remain read-only by default, and all approved monthly/reporting UI constraints remain unchanged.
