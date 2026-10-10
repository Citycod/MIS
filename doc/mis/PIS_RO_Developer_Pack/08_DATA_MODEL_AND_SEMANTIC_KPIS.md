# Data Model, Reporting Grain and Financial KPI Semantics

## Rules of evidence

The original 15-page source validates or reconstructs Excel-derived RO profitability formulas (especially pp.5–7 and 12–13), but flags crucial unresolved definitions on p.14. This pack **does not approve** them. Boss review changes UI granularity and scope; it does not magically settle financial accounting policies.

## Proposed entities (logical, not final physical DB)

**Current integration:** the entities below are logical reporting concepts, **not instructions to create tables**. RO, customer, product, accounts, deals, movements and their histories belong to the **existing CRM database** where present. All financial KPIs must be implemented/approved by the DBA/Finance team as **SQL views in the database**, not a new KPI service. Discover actual source tables and physical views in `24`; do not assume they already exist from these logical examples. Missing history or Calculation Base is a blocked source/view mapping, not permission to manufacture it.


| Entity | Key | Attributes / important relationships |
|---|---|---|
| `region` | region_id | name, hierarchy, effective-dated validity |
| `user` | user_id | identity-provider ID, staff ID, role(s) |
| `ro` | ro_id | staff ID, name, team, branch, manager, active period |
| `ro_region_assignment` | composite | ro_id, region_id, valid_from, valid_to; preserve history |
| `manager_region_scope` | composite | user_id, region_id, valid_from, valid_to |
| `customer` | customer_id | type, source reference, currency associations |
| `customer_ro_assignment` | composite | customer_id, ro_id, valid_from, valid_to; immutable history |
| `product` | product_id | category, currency/approved rules |
| `deal` | deal_id | customer_id, product_id, booking dates, tenor, rate, linked rollover deal |
| `deal_event` | event_id | deal_id, event_type, amount, booking/effective date, external-vs-internal flag |
| `pool_rate_version` | rate_id | product, tenor band/currency, rate, valid period |
| `ro_target` | target_id | ro_id, fiscal year, type, product where applicable, approved allocation |
| `position_snapshot` | (date, deal_id) | authoritative booked/current balance, snapshot version, currency |
| `deal_period_accrual` | (deal_id, period) | base, day count, income, expense, margin, approved rule version |
| `ro_monthly_movement` | (month, ro, product, currency) | opening, inflows, outflows, adjustments, closing, reconciliation |
| `ro_monthly_kpi` | (month, ro, product, currency) | approved targets, income, expense, WACC numerator/denom, profitability |
| `region_monthly_kpi` | derived | calculated from RO/deal grain **as-of** memberships; no unweighted WACC average |
| `report_run` | report_run_id | filters, generated as-of, version, requesting user, artifact metadata |

**Region association** is new from boss, not part of the source master list. Confirm whether RO attribution follows current region or historical `valid_from` membership for historic reporting.

## Facts have different time grains

1. **Portfolio position** = stock measure, **as-of** reporting date or end-of-month. NEVER sum across dates; snapshots must be selected at cutoff.
2. **External inflow/withdrawal** = flow measure, add over events within period.
3. **Rollover** = transaction renewal/retention measure; **not** automatically additive to external new inflow or portfolio net movement.
4. **Interest income/expense** = accrual/period flow measure; sum approved deal-period accruals.
5. **Target** = assigned annual or period target; requires approved allocation if displayed monthly.
6. **WACC** = weighted rate calculated from eligible underlying amounts; NOT average of RO WACC values.

## Proposed monthly movement reconciliation (NEEDS FINANCE SIGN-OFF)

```
Closing Portfolio Position
  = Opening Portfolio Position
  + New External Inflows
  - External Withdrawals / Liquidations
  + Net Recognized Valuation / Accrual Movement
  + Approved Adjustments
```

**Rollover** is reported separately as a retention event and only affects this equation if a genuine incremental cash movement (top-up / withdrawal) is recognized. The exact account movement and balance convention are unresolved. Never force a reconciliation with invented adjustment records; expose discrepancy safely to data operations.

**Monthly net external movement** = New External Inflow − Authorized External Outflows.  
**Monthly position change** = Closing Position − Opening Position.  
These are *not always equal* (accrual, FX, adjustments); label separately.

## KPIs verified / documented in source

- `Weight = Customer Inflow / Total Inflow` within agreed aggregation grain.
- `Weighted Rate Contribution = Customer Interest Rate × Weight`.
- `WACC = Σ(weighted contributions)`, equivalently `Σ(eligible amount × rate) / Σ(eligible amount)` with consistent eligibility.
- `Pool Spread = Pool Rate − WACC` (when pool rate truly comparable at same grain).
- `Maturity Date = Effective Date + Tenor(days)`.
- `Tenor Interest = Inflow × Customer Rate × Tenor / 365` in workbook.
- `Maturity Balance = Inflow + Tenor Interest` in workbook.
- `Monthly Interest Expense = Calculation Base × Customer Rate × Applicable Days / 365`.
- `Interest Income = Calculation Base × Pool Rate × Applicable Days / 365` (source formula register and Excel mapping); one narrative calculation chain uses `Principal` instead; **must reconcile**.
- `Deal Margin = Interest Income − Interest Expense`.
- `Observed MPR Margin = Interest Income − WHT − Interest Expense` (not yet approved as official).
- `Observed Profitability = Management Margin − OPEX`.
- `Position Gap = Target − Current Position`.
- `Achievement % = Current Position / Target × 100` if target > 0.
- `Monthly Required Run Rate = Remaining Target / Remaining Months`; denominator convention must be approved.
- `Daily Required Run Rate = Remaining Target / Remaining Applicable Days`; day basis unapproved; **do not build a daily chart**.

## MTD and YTD specification

- **MTD flow:** events/accruals from first day of selected current/reporting month through effective `asOf` date.
- **YTD flow:** first day of fiscal/calendar year through effective `asOf` date. Original source assumes calendar year from 1 Jan; fiscal-year exception requires approval.
- **YTD monthly chart:** one **monthly** bucket per month Jan→selected as-of month; current partial bucket labeled `MTD / provisional` if applicable.
- **MTD position:** closing/as-of balance on the selected as-of date; NOT sum of daily balances.
- **YTD position trend:** month-end snapshots through as-of month; NOT sum of monthly closing balances.
- **MTD donut:** eligible investment **flow amount** by product over month; **YTD donut:** eligible investment **flow amount** by product over year; this denominator choice is a **proposal** pending boss/finance sign-off. If they intend outstanding invested portfolio share instead, switch both to **as-of snapshot** and label `Portfolio Product Mix as of ...`, not MTD/YTD flow.
- Deal count and distinct customer count: compute distinct IDs in authorized scope, not by summing per-month distinct counts.
- **Filter by product** means donut may show a single slice (e.g. 100% selected product); provide contextual note.

## Approved metric availability

Represent financial measures as `value`, `currency`, `definitionVersion`, `reportingAsOf`, `dataVersion`, `approvalState`. If definition missing, result is `null/pending-definition`, **not** 0. No UI mock should assert final WHT/OPEX without approved rules.

## Region and customer attribution

A manager's region aggregate must be computed from RO assignments effective on the relevant event/snapshot date, consistent with the approved historical attribution rule. Reassignments must not reattribute previous deals to new RO or region without a documented business restatement process. Scoped joins must not duplicate transaction amounts if one customer has multiple products/accounts.

## Precision, currency and correctness

- Store money as DECIMAL or integer minor units; API JSON decimal string to avoid JS floating-point loss.
- Percentages and interest rates use decimal canonical form with documented output presentation.
- FX consolidation prohibited absent dated approved FX conversion rule; if multicurrency, show per currency or FX rule version.
- For zero target, show `N/A` for achievement; for negative gap (overachievement) show `Surplus` or signed number, no invented RO status.
- Historical reports must be reproducible using snapshot, region membership, rate/rule version and as-of.

## Minimum database SQL-view interface contracts (logical / proposed)

```
vw_ro_monthly_portfolio_movement
  month, as_of_date, region_id, ro_id, product_id, currency,
  opening_position, new_external_inflow, external_outflow,
  valuation_accrual_adjustment, other_adjustment,
  closing_position, net_external_movement,
  data_version, definition_version

vw_ro_monthly_target_profit
  month, region_id, ro_id, product_id, currency,
  target_for_period, annual_target, interest_income,
  interest_expense, deal_margin, wht, opex,
  management_margin, profitability,
  wacc_weighted_numerator, wacc_weighted_denominator,
  approved_rule_version

vw_investment_product_mix
  event_date, month, region_id, ro_id, product_id,
  eligible_investment_amount, currency, event_classification,
  definition_version
```

**No historical region/RO reassignment is allowed to erase previous attribution.**

**Important:** The three `vw_*` names in this section are proposed **semantic interface examples only**, not confirmed production view names. A DBA must map each to an actual verified SQL view, confirm read-only grants, date grain, region/RO attribution and approved formula versions. Next.js and Apache Superset must both consume these **same signed-off views**; no additional JavaScript/Superset calculation layer for the authoritative metrics.
