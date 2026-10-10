# CRM Database Discovery, Schema & SQL View Mapping Worksheet

**Status:** Required data-contract and security discovery for the confirmed direct database integration. This file replaces the obsolete CRM REST API endpoint worksheet.

## 1. DBA / finance discovery checklist

- [ ] Database engine and version (PostgreSQL / MS SQL Server / MySQL / Oracle / other: **TBD**)
- [ ] Environment hosts and private connection route (development / test / production)
- [ ] Approved connection driver and runtime (Next.js Node server, Superset Python SQLAlchemy driver where supported)
- [ ] TLS certificate and identity/secret handling; rotation procedure
- [ ] Restricted read-only service principal permissions and schema grants
- [ ] Whether queries read the core CRM database, a read replica, or approved reporting database
- [ ] Approved table inventory, primary/foreign keys, date types, currency definitions
- [ ] **Approved finance calculation views** exist and are maintained; view owner + version
- [ ] Reporting cutoff, period close, late transactions, backdated corrections, history retention
- [ ] Access-policy source for staff → RO and manager → authorized regions/ROs
- [ ] Superset read-only principal and dataset/view visibility reviewed
- [ ] Allowed query concurrency, timeouts, indexes/materialization and monitoring
- [ ] PII masking, export restrictions, retention and audit requirements

## 2. Table / view inventory (fill only from actual database catalog)

| Required domain | Actual schema.object | Object type (table/view) | Key/grain | Required columns | Owner | Approval/status |
|---|---|---|---|---|---|---|
| Region/branch/team | TBD | TBD | region/effective date | IDs/name/hierarchy | TBD | Pending |
| Relationship Officers | TBD | TBD | RO/staff | ID, employee ID, team, manager | TBD | Pending |
| RO-region assignments | TBD | TBD | RO/region/time | valid from/to, reporting attribution | TBD | Pending |
| Customer master | TBD | TBD | customer | ID/type/name | TBD | Pending |
| Customer-RO assignments | TBD | TBD | customer/RO/time | effective from/to | TBD | Pending |
| Products | TBD | TBD | product | ID/category/currency | TBD | Pending |
| Accounts / balances | TBD | TBD | account/as-of | balance, currency, date | TBD | Pending |
| Investments / deals | TBD | TBD | deal | inflow, dates, rate, tenor, rollover ID | TBD | Pending |
| Investment events | TBD | TBD | transaction | type, signed amount, effective date | TBD | Pending |
| Annual targets | TBD | TBD | year/RO/product | amount, allocation/version | TBD | Pending |
| Approved monthly movement | TBD | **view required** | month/RO/product/currency | open, inflow, outflow, adjustments, close | TBD | Pending |
| Approved RO monthly KPI | TBD | **view required** | month/RO/product/currency | target, income, expense, WACC components, gap/pace | TBD | Pending |
| Investment product mix | TBD | **view required** | event/period/RO/product/currency | eligible investment amount | TBD | Pending |
| Profitability detail | TBD | **view required** | deal/reporting period | rate, applicable days, base, WHT/OPEX/approval | TBD | Pending |
| Snapshot/freshness metadata | TBD | TBD | as-of/view version | reporting cutoff, validation status | TBD | Pending |

**Important:** Entries such as `vw_ro_monthly_portfolio_movement` elsewhere in this pack are **proposed logical view interfaces**, not evidence that a similarly named SQL view exists in CRM. Record real fully-qualified names **only after DBA confirmation**.

## 3. View-by-view field mapping

Duplicate this table for each discovered view:

| PIS field | Actual `schema.view.column` | SQL type/precision | Grain | Currency/rate units | Date/time meaning | Null meaning | Business owner/signoff |
|---|---|---|---|---|---|---|---|
| `closingPosition` | TBD | TBD | as-of or month-end | NGN or multi-CCY | reporting cutoff | missing≠0 | Pending |
| `newExternalInflow` | TBD | TBD | month | currency | effective vs posted | missing≠0 | Pending |
| `externalOutflow` | TBD | TBD | month | currency | effective vs posted | missing≠0 | Pending |
| `netMovement` | TBD | TBD | month | currency | period | missing≠0 | Pending |
| `target` | TBD | TBD | month or year | currency | applicable year/month | missing≠0 | Pending |
| `achievementPct` | TBD | TBD | snapshot | percent | period | undefined when target 0 | Pending |
| `monthlyRequiredPace` | TBD | TBD | snapshot | currency/month | remaining months | undefined when no months | Pending |
| `profitability` | TBD | TBD | deal/month | currency | approved accrual period | unapproved→null | Pending |
| `waccNumerator` / `waccDenominator` | TBD | TBD | deal/period | units documented | period | missing→null | Pending |
| `eligibleInvestmentAmount` | TBD | TBD | product/period | currency | MTD/YTD event date | pending donut definition | Pending |

## 4. Crucial finance and reporting sign-off

- [ ] Distinguish **portfolio position** stock from monthly **inflows/outflows** flow.
- [ ] Month boundaries, MTD/YTD “as-of” logic, timezone and late-posting policy defined.
- [ ] How region and RO reassignment affect historical attribution approved.
- [ ] Rollovers classified and excluded from external new inflow unless approved otherwise.
- [ ] Product mix donut base agreed: eligible investment **flow** amount vs **as-of outstanding invested position**.
- [ ] Calculation Base business definition confirmed (original workbook Column C).
- [ ] WHT, OPEX, margin, denominator conventions, maturity/principal basis confirmed.
- [ ] No across-currency aggregate without approved FX conversion rules.
- [ ] Regional aggregation reweights WACC using numerator/denominator, not a naive RO average.
- [ ] Monthly movement reconciliation and tolerance defined by finance.

## 5. Authorized filtering and SQL security test matrix

| Request | RO | Regional Manager |
|---|---|---|
| Own RO / region | Allow | Allow if assigned |
| Any other RO outside scope | 403/empty per approved security policy | 403/empty |
| Authorized region, all assigned ROs | Not allowed to broaden scope | Allowed |
| Another region | Deny | Deny |
| Direct customer/investment ID outside scope | Deny | Deny |
| Product / date outside allowed data or availability | Scoped empty/unavailable | Scoped empty/unavailable |
| Export / Superset drilldown / token RLS | Same scope | Same scope |

Implement **parameterized scope predicates** and verify SQL view underlying permissions; “filter it in JavaScript” is not access control.

## 6. Reconciliation and sign-off worksheet

| Metric + filters + as-of | SQL view result | Next.js KPI | Superset chart | Export result | Variance | Owner approval |
|---|---:|---:|---:|---:|---:|---|
| Monthly closing position | TBD | TBD | TBD | TBD | TBD | Pending |
| Net external movement | TBD | TBD | TBD | TBD | TBD | Pending |
| RO/region position gap | TBD | TBD | TBD | TBD | TBD | Pending |
| MTD/YTD investment donut total | TBD | TBD | TBD | TBD | TBD | Pending |
| Profitability | TBD | TBD | TBD | TBD | TBD | Pending |

## 7. Delivery artifacts

- Database connectivity decision record and approved credentials path (never values).
- Actual physical object/column inventory with lineage to source tables.
- View-definition owner approval, calculated metric versions and release/change process.
- Signed region/RO entitlement mapping.
- BI database account privileges and Superset dataset configuration.
- QA evidence for direct ID access denial, region isolation and number parity (`25`).
