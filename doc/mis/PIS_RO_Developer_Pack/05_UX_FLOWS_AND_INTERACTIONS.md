# UX Flows and Interaction Contracts

## Flow 1 — RO checks current month

`Login → RO Dashboard → inspect top filters (Region/RO locked) → choose Month/MTD and Product → Apply → cards and Superset movement/target/product-mix refresh together → click Portfolio Movement → inspect month ledger → drill into relevant deal`.

**Acceptance:** last applied filters remain in URL and back navigation; no Today-account-opening card or Daily Performance chart.

## Flow 2 — RO compares MTD with YTD investments

`RO Dashboard → Product Investment Mix card → MTD → donut renders eligible current-month product amount → YTD → same donut switches to cumulative YTD eligible investment flow amount → product click opens filtered deal list only if implemented and authorized`.

**Clarify:** “investment amount” means e.g. booked inflows vs outstanding balance; decide and label explicitly. Do not use product profitability/achievement scores.

## Flow 3 — Manager filters authorized ROs

`Manager login → Regional Dashboard → Region A (authorized) → RO: All → select month/product → Apply → see regional aggregates and RO comparison → select RO 002 → focused RO detail → Back to Regional Dashboard with previous filters`.

**Edge:** selecting Region B removes RO 002 if not in B. Search results and export never include unauthorized ROs. No status column.

## Flow 4 — Manager region permission denial

`Manager tampers with URL regionId/roId → API rejects scope / uses server-resolved authorized scope → no rows or aggregate values leak → 403 or generic not-authorized state → audit record`.

Superset dashboard guest-token RLS must enforce the same restriction even if user manipulates embedded URL/filter settings.

## Flow 5 — Investigate profitability

`RO/Manager → Profitability → top filters → monthly income/expense + profitability → select customer/deal row → detail breakdown → source/calculation metadata tooltip`. If Calculation Base/WHT/OPEX rule not approved, do not show fabricated totals; use unavailable plus explanatory note.

## Flow 6 — Inspect maturity without action

`Portfolio/Investments → Maturities & Rollovers → choose month → open deal → view maturity terms / linked rollover`.

No fabricated `Renew`, `Liquidate`, `Edit` buttons in P0/P1 unless business authorizes operational changes.

## Flow 7 — Export

`Apply page filters → select Export → backend request receives normalized effective authorized filter set → generated file includes period, region/RO/product, as-of date, provenance → delivery or explicit failure`.

Never trust client-supplied region/RO to drive backend export scope.

## Global filter state machine

```
initial → draft selection → [Apply] → validating/syncing
        → applied filters in URL + query key + Superset embed
        → all visible views show same effective scope
        → [Reset] returns to role-safe defaults
```

- Filter draft does not update results until Apply (or use immediate apply consistently; default contract is explicit Apply).
- Date mode options: `MTD`, `YTD`, `Custom months`; optionally a selected as-of date. Show applied label visibly.
- For monthly charts, custom date ranges use first/last intersecting month with partial-month flags; do not mislabel a partial month as a full month.
- Date and period apply to flow metrics; portfolio balances use a point-in-time end-of-period snapshot.
- Filters must be accessible, keyboard operated and placed high enough not to scroll past the fold on desktop.

## Empty/error/security

- No records: scope-specific empty illustration/text; never zero if data is actually unavailable.
- No approved metric: `Awaiting financial definition` rather than `0`.
- Embed unavailable: retry and timestamps, but leave other KPI cards alive.
- Permission changed during session: clear forbidden cached queries and embeddings; return to safe home.
- Session expiration: protect unsaved settings, redirect to sign-in.

## Navigation link dictionary

| Starting surface | Action | Destination |
|---|---|---|
| RO Dashboard | Open position | My Portfolio |
| RO Dashboard | View movement | Portfolio Movement |
| RO Dashboard | Open profitability | Profitability Analysis |
| Regional table | Select RO | Regional RO Detail |
| RO/Regional customer table | View customer | Customer Detail |
| Deal table | View deal | Investment Details |
| Investment donut | Select product (if implemented) | Filtered Investments & Deals |
| Report list | View | Report viewer |

## Design-review gates

All transitions should be demonstrated in both RO and Regional Manager persona. Review snapshots after applying Region/RO/Date/Product across the boards. A text-only scope notice should show whether a manager is viewing `All ROs in selected region` or `One RO`.

## Database connectivity and SQL-view behavior in UX flows

- Every filter change is validated against identity-derived, effective-dated region/RO permissions **before scoped database queries**.
- A database timeout, connection error, missing view or denied query is shown as a safe error state, **never** as an empty portfolio or zero profitability.
- Nested route identifiers for customer/deal data are authorized on the server to avoid enumeration; never depend on visually hidden controls.
- Use reporting cutoff, view-version and refresh metadata only if the database/reporting layer supplies them. Do not promise live updates.
- All CRM operations remain read-only until separately approved. No REST CRM pagination/rate-limit/auth assumptions are required.
