# Requirements Traceability Matrix

## Source terminology and evidence

**Base source:** *Relationship Officer Performance & Profitability Module — Consolidated Business Requirements, Calculations, Forms, Reports and Dashboard Requirements*, 15-page document supplied earlier in this chat. Mapping below references the **document's printed page / numbered sections**, not invented implementation claims. **Latest boss notes** are higher-precedence updates supplied in this chat.

| Feature | Original source | Latest boss / revised disposition | Dev pack |
|---|---|---|---|
| RO portfolio, customers, deals, profitability | p.1 §§1–1.1 | Keep | `02`, `04`, `08` |
| RO own scope; team manager views | p.2 §2 | Extend with **Region Manager** specific regional view/scoping | `02`, `04`, `11` |
| RO master/customer assignment history | p.2 §3 | Keep data semantics; read-only RO UI | `04`, `08`, `11` |
| Product list/config | pp.2–3 §3.4 | Keep product filter/labels; remove standalone product performance board | `01`, `03`, `09` |
| Annual targets/budgets | p.3 §4 | Keep read-only target/run-rate presentation; no administration UI | `04`, `08` |
| Account-opening target, daily/MTD/YTD accounts | p.3 §4.4 and p.4; pp.10–11 §9 | **Removed from current UI** by boss | `01`, `03`, `13` |
| Investment/rollover fields | pp.4–5 §5 | Keep investment read-only records; classify new inflow/rollover distinctly | `04`, `08` |
| Weight/WACC/spread/interest formulas | pp.5–7 §6 | Implement verified formula semantics in approved SQL calculation views; unresolved fields remain blocking | `08`, `15` |
| RO Position: gap/achievement/run rate | p.7 §7 | Keep as monthly-centric KPIs | `04`, `08` |
| Daily performance event metrics | pp.7–9 §8 | Replace daily dashboard with **monthly portfolio movement**; numeric daily pace only if approved | `01`, `04`, `08` |
| Daily snapshots | p.9 §8.5 | Retain backend history; view month-end/as-of snapshots | `08`, `09` |
| Recommended charts | p.10 §9.2 | Replace superseded charts; use approved revised catalog | `09` |
| Manager comparisons / drill-down | p.10 §9.3 | Regional Manager scope, selectable authorized ROs | `04`, `09`, `11` |
| Product target vs actual | p.10 §9.4 | **Remove performance-by-product board**; retain **investment mix donut** explicitly requested | `01`, `09` |
| Profitability report | pp.10–11 §9.5 | Keep if rule-approved | `04`, `08` |
| Account Opening Report | p.11 §9.6 | Removed from current release | `01`, `03` |
| RO Position / Maturity-Rollover Reports | p.11 §§9.7–9.8 | Keep and regionalize | `04`, `09` |
| Aggregation / weighted-rate exception | p.12 §10 | Keep exact semantics | `08`, `13` |
| Calculation engine separate from Superset | p.12 §10.3 | **Mandatory** | `07`, `09` |
| Formula register + Excel mapping | pp.12–13 §§11–12 | Keep for backend reconciliation | `08`, `15` |
| Calculation Base undefined | p.13 §12.1 | Block formula implementation pending confirmation | `08`, `15` |
| Worked example | pp.13–14 §13 | Fixture context only, never confirmed production value | `12` |
| Unresolved financial/account rules | p.14 §14 | Still open unless signed by client | `15` |

## Boss review compliance checklist

- [ ] Account Opening removed from current app and reports.
- [ ] No Accounts Today or daily account-opening KPI.
- [ ] Daily Performance replaced with **Portfolio Movement**.
- [ ] Monthly charts, MTD/YTD investment views.
- [ ] Global Region/RO/Date/Product filters at top of all boards.
- [ ] Product performance breakdown/scorecards removed.
- [ ] **Investment product mix donut** retained and switchable MTD/YTD.
- [ ] Status and Recent Activity removed from analytical boards.
- [ ] Regional Manager has authorized RO comparison and drilldown.
- [ ] Superset is chart provider; DBA/Finance-approved CRM SQL views are the authoritative calculation layer.

## Known inconsistencies to resolve

- Original source includes account opening prominently, but boss removed it for current release.
- Original source calls for daily RO tracking; boss now emphasizes monthly portfolio movement and MTD/YTD.
- Original source has Manager/Team Head but not regional hierarchy; boss introduces regional role.
- Original source mentions product performance; boss prohibits it except product investment **composition**.
- Old AI-generated screenshots depict workflows and data not grounded in approved source; ignore them as implementation specifications.

## Current integration trace — CRM database + SQL views (10 Oct 2026)

| Decision | Evidence | Updated docs | Verification |
|---|---|---|---|
| **Direct CRM database access from Next.js server** | Project-owner revision (10 Oct 2026) | `07`,`10`,`16`,`21`,`23`,`24` | Database engine and object mapping, read-only connection |
| **All approved financial calculations in SQL views** | Project-owner revision (10 Oct 2026) | `08`,`09`,`10`,`23`,`24` | Finance view sign-off and numerical parity |
| **Apache Superset self-hosted/downloaded** | Project-owner revision (10 Oct 2026) | `09`,`18`,`25`,`26` | Installed version, scoped reporting datasets, guest-token/embed QA |
| **Previous CRM API + KPI service withdrawn** | Latest decision overrides 09 Oct API direction | `00`,`01`,`16`,`23` | Repository does not contain fake CRM API adapter or independent calc logic |
| **Monthly/Regional/UI changes unchanged** | Boss review notes | `01`–`06`,`09`,`13` | Scope/filter tests and screenshot review |

The original source's “central calculation engine separate from charts” remains satisfied through **approved SQL views**, provided finance/DBA attest they are the authoritative reusable calculation layer.
