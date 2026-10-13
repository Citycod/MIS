# MIS global filter contract — Phase B

All existing PerformanceRepository method signatures remain unchanged. `GlobalFilters.roleView` is optional for backwards compatibility with callers; server normalization always supplies a safe lens. The existing five data filters retain their meanings.

| URL/API field | Values and default | Server behavior |
|---|---|---|
| `roleView` | `portfolio-overview` (default), `investment-breakdown`, `monthly-movement` | Unknown strings, including CFO/Admin/role names, normalize to Portfolio Overview. Controls presentation order only. |
| `regionId` | Trusted user's explicit `regionId` | Both supported roles are locked to this authorized primary assignment. Other IDs fail scope validation, even if present among additional region entitlements. |
| `roId` | Own RO for an RO; `ALL` for an RM | ROs cannot select another identity or ALL. RMs may select one entitled RO in the primary Region or all entitled ROs there. Invalid Region/RO pairs fail. |
| `asOfDate` | Active catalog default: Phase 2 `2026-09-30`; demo-v2 `2026-10-10` | Strict ISO/calendar validation. Exact snapshot required for reporting data. Unsupported dates show no data; never round or substitute. |
| `productCode` | `PROD-ALL` or an active catalog product | Unknown products fail. Existing data catalog remains the approved product set; Role View creates no product permissions. |
| `periodMode` | `MTD` (default) or `YTD` | A single global control supplies repository queries and embedded chart tokens. Other values fail. |

Duplicate dashboard URL fields fail. Guest-token API filter values must be strings and keys must be allowlisted. Existing malformed-input, same-origin, dashboard-role, signed-session, and private/no-store handling remains active.

## URL and navigation

Apply commits all draft controls together using the current route and `router.push`. MTD/YTD also commits the current draft so there is no second period state. The applied-state text remains distinct from edits awaiting Apply. Refresh, back, and forward receive server-normalized URL filters; the keyed filter form resets its draft when the effective URL changes.

RO drill-down and Back to all ROs retain Date, Product, Period, and Role View through `filterQuery`. Selecting All ROs on an officer detail route returns to the regional dashboard. Changing officer retains Date/Product/Period because the active catalog supports those same selection domains; unavailable combinations return no data. Region changes are disallowed under the current approved role rules. Reset restores the catalog reporting date, all products, MTD, Portfolio Overview, and own/all authorized officers as appropriate.

Applying filters hides prior KPI/table/chart results until the replacement response is ready. Embeds are keyed by normalized filters; old frames and pending credential requests are removed. Errors do not provide fallback financial records.

## Permission matrix

| Capability | Relationship Officer | Regional Manager |
|---|---|---|
| Principal identity | Signed session; unchanged by filters | Signed session; unchanged by filters |
| Region | Assigned primary Region, locked | Assigned primary Region, locked |
| Officer | Self, locked | One entitled officer or All ROs within assigned Region |
| Role View | Three approved presentation lenses | Same three presentation lenses |
| Date/Product/Period | Active reporting catalog within own scope | Active reporting catalog within selected authorized scope |
| Dashboard resources | Existing RO registrations and shared investment mix | Existing regional registrations and shared investment mix |
| Role View affects RLS or records | Never | Never |
| Additional regions without primary assignment | Denied | Denied; stakeholder decision required |
| CFO impersonation/elevated access | Unavailable | Unavailable |

`User.regionId` already represents the explicit primary Region. The normalizer never chooses the first entry in `allowedRegionIds`. A missing, invalid, or unauthorized primary assignment fails closed; multiple entitlements with a valid primary remain locked to that explicit primary.

## Period interpretation

MTD/YTD affects period-flow summaries, monthly movement rows, product composition, and signed chart scope. Portfolio balances and annual targets remain as-of-date positions and annual references. The KPI and RO comparison columns explicitly labelled Monthly Net Movement remain monthly, including when the wider history selection is YTD. No YTD value is fabricated for a monthly-only repository field.

The existing demo-v2 YTD RO comparison chart uses a maximum-over-months convention. Its panel labels that limitation; see the implementation handoff. Annual/product targets and unsupported profitability/WACC/run-rate metrics keep their existing availability rules.
