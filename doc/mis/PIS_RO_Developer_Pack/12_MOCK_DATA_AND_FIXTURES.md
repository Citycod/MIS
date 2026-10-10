# Deterministic Mock Data and Reconciliation Scenarios

Mock environment must look believable but must not imply production financial results. Use synthetic customers, ROs, deal IDs, regions and NGN values. All views derive from **one consistent fixture dataset**. Label environment `Demo / Synthetic Data`.

## Seed roles

| ID | Role | Scope |
|---|---|---|
| `USR-RO-001` | RO | `RO-001` / `REG-01` |
| `USR-RO-002` | RO | `RO-002` / `REG-01` |
| `USR-RM-001` | Regional Manager | `REG-01` (Lagos) |
| `USR-RM-002` | Regional Manager | `REG-02` (Abuja) |
| `USR-RO-003` | RO | `RO-003` / `REG-02` |

**No live names**, company details, account numbers, staff IDs or other sensitive data. Use fictional names such as Customer Alpha Trading, Customer Beta Logistics.

## Seed movement ledger (illustrative, NGN)

| Month | RO | Opening | External inflow | External outflow | Adjustment | Closing | Net external |
|---|---|---:|---:|---:|---:|---:|---:|
| 2026-08 | RO-001 | 600m | 140m | 30m | 0 | 710m | 110m |
| 2026-09 | RO-001 | 710m | 120m | 30m | 0 | 800m | 90m |
| 2026-08 | RO-002 | 220m | 70m | 20m | 0 | 270m | 50m |
| 2026-09 | RO-002 | 270m | 50m | 10m | 0 | 310m | 40m |
| 2026-09 | RO-003 | 400m | 100m | 30m | 0 | 470m | 70m |

- Region REG-01 Sep closing = 800m + 310m = **₦1.11bn**.
- REG-01 Sep external inflow = 120m + 50m = **₦170m**.
- REG-01 Sep external outflow = 30m + 10m = **₦40m**.
- REG-01 Sep net external movement = **₦130m**.
- REG-02 is isolated from REG-01, even when queried by guessed IDs.

## Target fixture

- RO-001 annual position target = ₦1.2bn; Sep closing ₦800m; achievement 66.67%, gap ₦400m.
- RO-002 annual position target = ₦500m; Sep closing ₦310m; achievement 62%, gap ₦190m.
- REG-01 aggregate target ₦1.7bn; Sep position ₦1.11bn; gap ₦590m; achievement ≈65.29%.
- Monthly pace requires **remaining months** input from selected year/time and approved counting convention; do not hardcode example figures to different reporting dates.

## Investment product mix fixture (eligible Sep flows, NGN)

- RO-001: Fixed Deposit 70m; Treasury Bills 30m; Sukuk 20m = 120m.
- RO-002: Fixed Deposit 20m; Treasury Bills 20m; Sukuk 10m = 50m.
- REG-01 totals: Fixed Deposit 90m; Treasury Bills 50m; Sukuk 30m = 170m.
- Percentages: ~52.94%, ~29.41%, ~17.65%; slice total **100%**.
- **Purpose:** exercise the **investment composition donut**, not product performance achievement/profit.
- YTD fixtures must contain Jan–selected reporting month rows and sum to YTD; do not fabricate YTD by multiplying a single month.

## Edge fixtures

- Unapproved Calculation Base: margins/profit fields `null` with `pending-definition`.
- Over-target RO: negative gap; present `Surplus` not `status=good`.
- Zero annual target: achievement `N/A`, run rate unavailable.
- Matured rollover: linked old/new deals, no double-counted external inflow.
- Rollover with top-up: only top-up increments net external inflow when approved.
- Customer reassigned between two ROs at month boundary; historical events retain original attribution.
- RO moved to different region; regional manager viewing historical period does not leak according to approved policy.
- Selected product yields one donut slice with 100%; no misleading multicolor donut.
- Zero eligible investment activity: render empty donut state.
- No approved conversion: mixed-currency aggregate not displayed as NGN.
- Partial month: labels current month `provisional / MTD`.

## Fixture testing rules

- Cards, table totals and Superset seed datasets reconcile for one scope/date/product.
- No `accountsOpenedToday`, `accountOpening`, `productPerformance`, `recentActivity` or dashboard `status` fields in revised mocks.
- No random values per render.
- Fixtures support 401/403/404/409/500 and Superset token failure simulation.

## Mock database repository and approved SQL-view fixture approach

Use paired **synthetic source table/view rows** and **normalized PIS DTOs** for each repository method. Do not invent production physical SQL object names or database column mappings. Seed deterministic RO-region assignments, investment events, monthly movement, versioned approved KPI view outputs, null financial definitions, multiple currencies, cross-region denials, missing SQL view and database timeout cases. Finance mock values represent synthetic **SQL-view outputs**, not calculations performed by React. Actual driver/SQL tests wait for the catalog and DBA sign-off in `24`.
