# 04 — Dashboard charts, filters and authorization

## Existing dashboard charts — do not add an unrelated dashboard for every chart

| Context | Chart | Suggested Superset Explore type | Data view | Notes |
|---|---|---|---|---|
| RO / regional performance | Monthly Portfolio Movement | Grouped/stacked bar for inflows and withdrawals with net movement line if supported; separate bars otherwise | `v_demo_monthly_ro_product_movement` | Opening/closing positions are *snapshots*, do not sum over months |
| RO / regional performance | Closing Portfolio Position Trend | Time-series line | `v_demo_monthly_ro_position` | Month-end balance; region aggregation is sum over ROs **at one month**, not sum across dates |
| RO / regional performance | RO Position vs Annual Target | Horizontal grouped bar | `v_demo_monthly_ro_position` (selected month) | RM/CFO only where authorized; annual target is **not** an approved monthly target |
| RO / regional performance | Investment Product Mix | Donut | `v_demo_investment_mix` | Separate MTD/YTD date scopes; approved definition pending |
| Optional proposed Product Analytics | Product month-over-month inflows | Time-series bar or line | `v_demo_events` | **Do not implement without approval** |

### Demo movement semantics

- Raw stored amounts are **positive** for all event types.
- `NEW_INFLOW` contributes positively to external flow; `WITHDRAWAL` is subtracted; `ROLLOVER` and `MATURITY` stay informational in demonstration view pending approved treatment.
- Month-end reconciliation: `closing position = opening position + external inflows − withdrawals` for this *demo-only* scenario. It is computed in SQLite **view**, not in Next.js or chart expressions.
- `v_demo_monthly_ro_position` contains approved-definition placeholders (`NULL`) for WACC, profitability and monthly run rate. Display **Pending Finance Definition**, never `0`.

### MTD/YTD donut

For **as-of date 10 Oct 2026**: MTD = 1–10 Oct 2026; YTD = 1 Jan–10 Oct 2026. Use actual event dates from `v_demo_events` for partial month MTD (not full October), and aggregate `external_inflow_ngn` **by product** within the selected authorized scope. Only positive eligible values become slices. A product filter may collapse the donut to one 100% slice, which should be explained in the UI. This interpretation of investment mix as external **NEW_INFLOW** is **unapproved demo convention**, awaiting Finance approval.

### Filter model — draft pending owner approval

- Existing approved top filter controls: **Region, RO, Date, Product**; period controls **MTD/YTD** per applicable section.
- Proposed additional **Role View** selector: this is a *view mode*, not a trusted identity switch. The actual principal and its access scope come from server session/SSO and Superset RLS.
- RO selecting another role-view mode cannot see another user's RO/region or gain CFO access; provide only genuinely authorized view modes.
- RM Region is **locked** to assigned region by latest stated requirement; RO choices only within that region. Multi-region RM behavior requires explicit decision.
- CFO default dashboard/report 'own stuff' remains **undefined**. Never implement unbounded full-bank permission just because a CFO label is present.
- Date filters show human dates but use ISO (`YYYY-MM-DD`) in state/query; report snapshot and flow window must remain distinct.
- Proposed saved views store the **filter selection** and dashboard context per user, never authentication or entitlements. Revalidate filters on *every* load; stale/deauthorized saves produce an explanatory error or narrowed scope.

## Embedded Superset security & filtering

1. **Next.js server** authorizes each requested chart/dashboard key and enforces effective scope on queries and filter options.
2. **Superset server** independently enforces row-level security for the guest-token role/datasets; do not rely on chart params, `iframe` query strings, hidden controls, or React route guards.
3. Embed token is generated server-side with an approved, narrowly scoped role and short expiry. Never expose admin credentials or reuse a cross-user token.
4. Validate the **actual** installed Superset version's embedding and filter API. Avoid relying on undocumented iframe event hooks. Test user-specified Region/RO/Date/Product filter parity in **both** app KPIs and Superset visuals.
5. Test direct dashboard UUID reuse, token forgery/replay, unauthorized region/RO data and bookmarked filter escalation.
6. Use metadata labels `Synthetic demonstration data` and disallow live confidential exports from demo guest roles.

## Dark/light mode proposal

The Next.js shell can switch semantic theme tokens, but embedded Superset may not automatically follow the parent page theme. Verify a supported themed-dashboard approach in the running 6.1.0 environment; use a stable light embedded analytics surface as a clear fallback. Do not simulate charts with unapproved React chart libraries.
