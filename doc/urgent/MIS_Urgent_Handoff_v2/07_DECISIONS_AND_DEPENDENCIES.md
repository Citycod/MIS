# 07 — Decisions and missing approvals

Capture named owner, date, and evidence before turning an item into a requirement.

| ID | Question | Proposed safe default | Decision / owner |
|---|---|---|---|
| D01 | Does this urgent request formally supersede the approved Phase 2 scope? | **No** — treat as change request pending authorization | Pending |
| D02 | What exactly is the CFO's 'own stuff' dashboard and entitlement boundary? | No CFO route or organization-wide query until scoped | Pending |
| D03 | Is Role View just a presentation lens for ROs, or role impersonation requested? | Presentation only, never privilege escalation | Pending |
| D04 | Is each RM assigned to exactly one region? What about multi-region managers? | Locked to assigned region(s); selection only if explicitly authorized | Pending |
| D05 | Should RO, RM and CFO share one dashboard component/template? | Prefer shared components; preserve strict scope | Pending |
| D06 | Is Product Analytics approved as a distinct dashboard? Which KPIs? | Stage catalog only, do not restore removed scorecards | Pending |
| D07 | Saved preferred filters: per user, per role or shareable? | Private, revalidated on each request, no sharing by default | Pending |
| D08 | Is dark/light mode approved and must Superset switch in tandem? | Semantic UI token proposal, no Superset assumptions | Pending |
| D09 | Can new synthetic data replace Phase 2 fixture IDs? | Keep parallel; do not overwrite | Pending |
| D10 | What are official product names/IDs for `Shyta` and `Sira`? | Mark provisional; mapping pending | Pending |
| D11 | What does 'investment mix' measure: external inflows, current position, principal, rollover? | Demo uses only external NEW_INFLOW, clearly labeled unapproved | Pending Finance |
| D12 | What are authorized financial definitions (Calculation Base, WACC, pool rate, margin, day count, run rate, maturity/rollover)? | Null or pending until approved SQL views exist | Pending Finance/DBA |
| D13 | What is the confirmed production database engine and approved view inventory? | Existing demo SQLite separate; no production assumptions | Pending DBA |
| D14 | How does Superset 6.1.0 enforce each institutional principal's RLS on embedded dashboards? | No production embed until threat-tested | Pending Security |
| D15 | What is production SSO, role mapping, CFO authorization policy? | Dev synthetic personas only | Pending Identity team |

## Data-specific exceptions

- Original uploaded CSV has ten distinct alias rows but lacks Region/Product/RO; the 300 row fixture is a **generated test set**, not an expansion of real transactions.
- The previous urgent fixture had one repeated customer name, four IDs, single source row, formulaic calculation base and fixed pool rate. v2 corrects the lineage and **omits** unsupported calculation-base/pool-rate fields.
- The event type `MATURITY` is informational in this demo; do not assume it reduces portfolio principal. Withholding tax and profitability require official SQL views.
- The local repository verification confirmed Superset 6.1.0, separate metadata/reporting SQLite files, six dashboard registrations and the restricted guest-token flow. This remains local development evidence, not production deployment or institutional authorization proof.
