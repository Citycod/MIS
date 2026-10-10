# QA Plan and Acceptance Criteria

## Next.js-specific acceptance checks

- Protected `page.tsx` and server-data fetches reject unauthorized deep links before any sensitive React Server Component payload can be delivered; verify direct URLs and RSC navigation requests.
- Server Components and BFF handlers use authenticated private/no-store reads; test user A logout → user B login → browser back and query cache behavior.
- Interactive filters implemented with `next/navigation` preserve canonical query params and do not change role permissions; no `react-router-dom` dependency.
- `@superset-ui/embedded-sdk` is not evaluated during SSR; embedded dashboards mount in browser, clean up on route switch, and guest tokens are acquired through a scoped `app/api/bff` handler.
- Sensitive `NEXT_PUBLIC_` variables, source maps and browser requests never contain upstream credentials, token-signing keys, or admin secrets.
- `loading.tsx`, `error.tsx`, forbidden, session-expired and not-found routes render appropriate states without confidential-data flashing.

## Test layers

1. **Unit:** money formatter, locked filters, date normalization, metric availability, query serializers, run-rate display.
2. **Component:** global filter bar; KPI cards; monthly charts container; investment donut MTD/YTD toggle; tables/empty states.
3. **API contract:** normalized effective scope; typed data; `401/403/422`; decimal precision; version metadata.
4. **Integration:** shared filters update KPI API and Superset dashboards with same scope/snapshot; chart token handling.
5. **E2E:** login/RO/Regional Manager journeys, drilldown, exports, denial test, route removals.
6. **BI semantic:** measure validation, snapshot/flow correctness, WACC weighting, portfolio movement reconciliation, donut denominators.
7. **Security:** RLS, direct-object authorization, cache and export boundaries.
8. **Visual/accessibility:** WCAG AA, responsive layouts, no-overflow or nested iframe scroll traps.

## Mandatory product assertions

| Case | Action | Pass condition |
|---|---|---|
| AC-01 | Open RO dashboard | Filter row Region/RO/Date/Product shown **above** KPIs/charts. |
| AC-02 | RO attempts RO filter change | Control locked; outside-RO API request denied. |
| AC-03 | Login as RM / choose own region | RO selector shows all *authorized* ROs for selected region, no others. |
| AC-04 | Switch to another authorized region | RO list and all cards/charts reset to new region scope. |
| AC-05 | Tamper with unauthorized `regionId` | 403/no leaked figures in page, API, Superset, export. |
| AC-06 | Choose selected month | Movement x-axis month grain, no daily performance chart. |
| AC-07 | Toggle donut MTD→YTD | Values change to authorized eligible investment amounts, slice sum 100%. |
| AC-08 | Select product globally | Donut/table/chart/card reflect product filter consistently. |
| AC-09 | Inspect all screens | No Account Opening menu/wizard/report/KPIs or `Today` accounts-opened card. |
| AC-10 | Inspect boards | No Recent Activities chart/widget or dashboard Status column/badge. |
| AC-11 | Inspect navigation | No standalone Product Performance or product performance scoreboards. |
| AC-12 | Inspect investment history | Rollover does not inflate net external inflow. |
| AC-13 | Change as-of date | Snapshot portfolio updates without summing past monthly balances. |
| AC-14 | Load finance pending definition | `Pending definition`, not artificial zero/profitability value. |
| AC-15 | Regional RO compare | Total equals scoped deal/RO sum and WACC reweighted. |
| AC-16 | Disable Superset | Other data remains visible; accessible chart error and Retry shown. |
| AC-17 | Export report | Role/data and applied filters match screen; forbidden rows excluded. |
| AC-18 | Direct link to removed feature | Safe 404/unavailable, no accidental route. |
| AC-19 | Logout | Query cache/token discarded, browser back can't display sensitive rows. |
| AC-20 | Screen reader/keyboard | Global filter, data tables, dialog/menus and date pickers navigable. |

## Acceptance equations and data parity

- `regionalClosing = Σ eligibleROClosing`, by single currency and as-of.
- `regionalTarget = Σ eligibleROApprovedTarget` (de-duplicated).
- `achievement = closing / target × 100`, zero-target handling.
- `positionGap = target - closing`.
- `monthlyClosing = monthlyOpening + externalInflow - externalOutflow + adjustments` under approved signed-off rule.
- `donutΣsliceAmount = reported eligible investment amount`, and `Σpercent ≈100%` with rounding tolerance.
- `WACC_region = Σ(base×rate) / Σ(base)`; never average RO % equally.
- Superset tiles and corresponding API KPI values match for same `definitionVersion`, `dataVersion`, scope and time.

## Test cases for ambiguous requirements

Do not mark production release `PASS` for financial metrics until finance signs off Calculation Base, WHT, OPEX, day-count and position-movement policy. Test provisional fixtures separately as `design-only`.

## Exit criteria

- All P0 functional and cross-role tests pass.
- No P0 severity access/financial parity defect open.
- Business signs exact monthly investment-mix semantics and date behavior.
- BI validates Superset RLS and visual chart catalog against boss note.
- Product/design signs removal matrix and no outdated screenshots are used as functional source.

## CRM database + SQL-view integration acceptance suite (mandatory)

1. Verify read-only DB identities, engine/driver, TLS/network path, grants, pooling, SQL injection prevention and no browser-visible credentials.
2. Compare authorized source-table records and approved SQL-view aggregates to Next.js rendering and Superset queries at the same grain/cutoff.
3. Test cross-region/RO/customer/deal/exports/iframe IDOR with the **actual database repository**; fail closed.
4. Test view absence/version drift, timeouts, missing columns, currency mismatch and database unavailability as **error/unavailable**, not zero values.
5. Confirm monthly stock vs flows, MTD/YTD donut definition, weighted WACC, rollovers and approved profitability view parity.
6. Verify all SQL is parameterized and all effective sort/view choices are allowlisted.
7. Confirm Superset has its own limited read-only database principal, scoped datasets and tested guest-token RLS.
8. Confirm all removed Account Opening, Daily Performance, Status, Recent Activity and Product Performance features stay absent.

See `25_CRM_DATABASE_QA_AND_CUTOVER.md` for detailed evidence and go-live gates.
