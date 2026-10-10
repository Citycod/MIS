# Open Questions, Decision Log and Architectural Decisions

**Do not assume an unanswered item is approved just because a mockup contains it.** Product, Finance, Data/BI, Security and Engineering should record owner, decision, effective date, rule version and acceptance tests in this file/issue tracker.

## Blocking business clarifications

| ID | Decision needed | Recommended temporary behavior | Owner |
|---|---|---|---|
| **Q01** | Is `Remove Account Opening` permanent or current-release-only? | Exclude entirely from current UI; preserve historical source contract in backlog. | Sponsor/Product |
| **Q02** | Does `Remove Status` mean all pages or only performance dashboards? | Remove on dashboards/RO tables; keep backend lifecycle state, hide operational status UI until confirmed. | Sponsor/Product |
| **Q03** | For product investment mix MTD/YTD, is amount `new booked investment/inflow` or `outstanding investment balance`? | Mark denominator provisional; do not release chart as authoritative. | Finance/Sponsor |
| **Q04** | Should rollover count toward product investment mix and/or new external inflow? | Keep rollover separate and not external new money absent authorization. | Finance |
| **Q05** | Which monthly movement formula and source snapshot constitute official portfolio position? | Reconciliation-only synthetic fixture; no live production claim. | Finance/Data |
| **Q06** | Does `MTD / YTD monthly` imply current calendar year from Jan 1 and monthly x-axis? | Calendar YTD with partial current month explicitly labeled. | Product/Finance |
| **Q07** | Are managers assigned a single region or multiple regions; can assignments change during a year? | Support multi-region in permission model but one selected region per dashboard. | Identity/HR |
| **Q08** | Does historic regional reporting follow region at event date or present-day team structure? | Use historic as-of attribution in data model; restrict who may read historical ROs. | Finance/Security |
| **Q09** | What is official meaning of unlabelled `Calculation Base` from source workbook? | Block corresponding income/expense/profit metrics until mapping approved. | Finance |
| **Q10** | Are Deal Margin and MPR/Management Margin different official reporting levels? | Show explicitly distinct names only with approved definition. | Finance |
| **Q11** | Is WHT 10% of interest income or differently defined? | Do not hardcode 10%; configure approved rule. | Finance/Tax |
| **Q12** | Which OPEX items count and how allocated by RO/deal/period? | No final profitability absent OPEX approval. | Finance |
| **Q13** | Interest day basis / effective-date accrual / cap at maturity? | Use a documented source-system-approved day-count convention. | Finance/Treasury |
| **Q14** | Official pool rate by product/tenor/currency/date; historical versioning? | Version rates, avoid example 24% hardcode. | Treasury |
| **Q15** | How should early liquidation, partial withdrawal, customer top-up and linked rollover affect movement and accrual? | Do not create edit flows; show source events once classified. | Treasury/Ops |
| **Q16** | Monthly required pace: calendar months left, include current month, fiscal period, target allocation rules? | Display only server-approved pace; otherwise show pending definition. | Finance/Product |
| **Q17** | Are customer/deal create/edit/renew/upload actions allowed for an RO? | **Read-only** until approved; old mockups not authority. | Sponsor/Ops |
| **Q18** | What exact Superset version and available native-filter/SDK features are deployed? | Run embedding/filter/RLS spike; version-pin and regression test. | BI/Platform |
| **Q19** | Which export formats, rate limits and retention rules are supported? | Hide or disable unsupported exports. | Compliance/Ops |
| **Q20** | Multi-currency reporting and any FX consolidation? | Separate by currency without authorized conversion. | Finance |
| **Q21** | Should a region with no RO selected mean `All current authorized ROs` or `All historically assigned`? | Default current authorized and period-effective scopes with clear label. | Sponsor/Security |

## Architecture decision records (proposed)

### ADR-001 — Source precedence

**Decision:** boss review notes override earlier chat design on release UI; original document remains formula/reference source where not overridden.  
**Consequence:** account opening requirements archived as unimplemented historical source; regional role introduced.

### ADR-002 — Two-level analytics architecture

**Decision (superseded 10 October):** DBA/Finance-approved SQL views compute authoritative financial values in the existing CRM database; Superset only visualizes those same views; Next.js owns shell, filters and operational tables.  
**Reason:** one definition for profitability, WACC, run rate; documented by original source architecture §10.3 p.12.

### ADR-003 — Regional row security

**Decision (revised 10 October):** Next.js server-side SQL query scope, approved database privileges/RLS where supported, AND Superset dataset/guest-token row restrictions; client filters are only presentation.  
**Reason:** managers cannot see ROs outside assigned region(s) even via direct links/exports.

### ADR-004 — Product investment donut allowed

**Decision:** product share chart retained but **not** a product-performance scorecard; select MTD/YTD.  
**Open:** eligible amount grain and rollover treatment.

### ADR-005 — Monthly grain, mixed metric semantics

**Decision:** movement/profitability as monthly flows; portfolio current position as as-of snapshot; target as approved allocation.  
**Reason:** avoids double counting and misleading chart axes.

### ADR-006 — Read-only business workflows until approved

**Decision:** do not implement account opening, investment mutations, compliance wizard or approval actions based solely on old images.  
**Consequence:** earlier mockups remain nonbinding style references.

## Formal decision template

```md
### Decision Qxx — title
- Owner:
- Date / approved version:
- Alternatives:
- Approved definition:
- Effective date:
- Data owner / system of record:
- UX impact:
- API/BI impact:
- Test example:
- Sign-off:
```

## Current CRM database integration questions (10 Oct 2026)

**10 October 2026 supersession:** Existing CRM database and calculation views replace CRM API + external KPI service. Questions below are **unknown** until the DBA and Finance provide verified evidence.

| ID | Clarification | Owner | Gate |
|---|---|---|---|
| DB-01 | DB engine/version, approved driver, host/network/private access, dev/stage/prod | DBA/Platform | Before live queries |
| DB-02 | Separate scoped read-only PIS and Superset principals, TLS, secret rotation | DBA/Security | Before connectivity |
| DB-03 | Real source tables/columns: ROs, region, assignments, customers, deals, products, balances | DBA/CRM owner | Before mapping |
| DB-04 | Approved **SQL views** for finance KPIs, period movement, product investment mix, detail | DBA/Finance/BI | Before live metrics |
| DB-05 | Actual signed-in user → allowed region/RO entitlement mapping and historical membership | Identity/CRM owner | Security blocker |
| DB-06 | DB view definitions/version, performance, indexes/materialization, read replica policy | DBA/BI | Before rollout |
| DB-07 | Monthly reporting cutoff, revisions, snapshot granularity, retained audit/history | Finance/BI | Before reports |
| DB-08 | Source of budget/targets, Calculation Base, WHT, OPEX, rollover, WACC denominators | Finance | Per-KPI blocker |
| DB-09 | Superset deployment, read-only dataset connection, guest-token RLS, filter-sync capability | BI/Platform/Security | Before live embed |
| DB-10 | Data visibility, masked fields, exports, recording/logging and retention | Security/Compliance | Before production |

Record actual object/view mappings in `24`, finance rules in `08`, QA evidence in `25`; do not invent SQL view names.
