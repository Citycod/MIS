# CRM Database + SQL Views — QA, Security and Cutover

**Status:** Proposed test gates for direct, read-only CRM database access and authoritative SQL-view calculations. These replace former CRM REST API contract tests.

## 1. Pre-connection controls

- [ ] DBA authorizes connectivity from the Next.js **server** and self-hosted Superset to approved source/reporting DB.
- [ ] Separate read-only accounts for PIS and BI with minimum required grants; no unintended DDL/DML.
- [ ] Credentials stored only in server secret manager and rotated as bank policy requires.
- [ ] TLS/allowlists/VPN/network segmentation validated; connection is not reachable from browser.
- [ ] Connection pooling, timeout, retry, query budget and concurrency are reviewed for CRM production load.
- [ ] ORM/driver chosen only after actual database engine is confirmed.
- [ ] All SQL queries bind parameters; sort/column selections come from an allowlist.
- [ ] All tested view identifiers and columns come from `24`, not fictitious names.

## 2. Data and financial correctness

| Test | Expected outcome |
|---|---|
| Same region/RO/product/date | Next.js KPI, SQL view, Superset chart and export reconcile |
| Monthly flows | MTD totals equal eligible event amounts in selected month and cutoff |
| YTD monthly chart | Only month-grain points; no daily chart on main board |
| Portfolio stock | Uses latest valid as-of snapshot; not sum of daily or monthly balances |
| Region roll-up | Only authorized ROs, each source record counted once |
| WACC roll-up | Weight underlying amounts; do not average RO WACC blindly |
| Position target/gap | Matches approved SQL view and target allocation |
| Product investment donut | Product slices sum to approved denominator; toggle MTD vs YTD |
| Rollovers | Classified separately from external new inflow per approved rules |
| Cross-currency | No unapproved mixed-currency totals |
| Profitability without approved formula | Unavailable/pending; never fabricated |
| Late correction/backdated transactions | Historical version and cutoff behavior verified |

## 3. Security negative tests

1. RO modifies URL `regionId` or `roId` to another user → server denies data, including table counts and filters.
2. Regional Manager requests an unauthorized region or RO → denial even if filtered dashboard would otherwise appear blank.
3. Direct customer/deal lookup by unauthorized ID → denial.
4. Report export bypassing UI filters → result cannot expand data scope.
5. Superset guest token generated for another dashboard/RO/region → denied; charts, underlying datasets and downloads remain scoped.
6. Shared connection pool context isolation: one user's scope cannot leak into the next query or session.
7. SQL injection, attempted `ORDER BY` column manipulation and abusive pagination are rejected.
8. A view with definer privileges must not become an elevation path; test grants and SQL privilege behavior with DBA.
9. No DB hostname, password, full SQL, account numbers or confidential payloads in error screens/build output/client bundles.

## 4. Reliability and negative operating cases

- [ ] DB unavailable → controlled data error; Superset error does not blank surrounding Next.js shell.
- [ ] SQL view missing/renamed → deployment blocks or page shows unavailable with correlation ID; never fallback to guessed calculations.
- [ ] Query timeout → bounded recovery and incident logging without exposing confidential SQL.
- [ ] Partial finance sign-off → corresponding metric hidden/unavailable while approved data remains visible.
- [ ] Superset not deployed → honest “Analytics not connected” placeholder, not a fake chart.
- [ ] Different data cutoff between KPI and chart → mismatch indicator, failed UAT if undisclosed.
- [ ] Database overloaded → separate read replica or optimized indexed/materialized reporting views only after DBA approval.
- [ ] Mock fixtures never silently replace production financial results.

## 5. Rollout gates

1. **Schema sign-off:** real tables, view names and columns filled in `24`.
2. **Business sign-off:** metric definitions and reconciliation tolerance approved.
3. **Security sign-off:** read-only principals, entitlements, safe SQL, Superset RLS.
4. **Integration sign-off:** Next.js server and Superset reach approved DB securely; both produce same scoped numbers.
5. **Functional sign-off:** no Account Opening, Daily Performance chart, Recent Activities, Product Performance scorecards or Status indicators; top four filters work everywhere.
6. **Performance sign-off:** representative query times under approved production-like load; no unbounded scans.
7. **Deployment sign-off:** secrets, rollbacks, backup/recovery for Superset metadata, audit and monitoring tested.

## 6. Rollback

Rollback Next.js release and/or Superset dashboard/dataset configuration independently, with compatible SQL view versions. Do not alter or drop existing CRM production tables as a PIS rollback. Use DBA-approved versioned view deployments and restore the previous approved view signature where needed. Notify report owners if finance figures were materially restated.

## 7. Definition of done

The direct database integration is ready only when the database engine and actual view contracts are verified, read access is approved, all regional/RO tests pass, all KPI and Superset values reconcile, confidentiality tests pass, and disabled/unresolved financial rules are represented honestly. No unverified SQL object or guessed profit formula may ship.
