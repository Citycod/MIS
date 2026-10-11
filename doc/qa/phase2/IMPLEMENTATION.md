# Phase 2 — RO and Regional Manager dashboards

Phase 2 only. Phase 3 and live Superset embedding are not implemented by this change.

## Existing foundation and baseline

Reused the Next.js 16.4 App Router application, Sterling-inspired palette, shell, demo persona login, `PerformanceRepository`, `KpiCard`, `ErrorPanel`, and `SupersetDashboardPlaceholder`. Reviewed the master prompt, screen specs, scope revisions, design system, authorization, fixture and chart catalog documents, and installed Next.js guides before editing.

Baseline: `pnpm lint` passed with six unused-parameter warnings; `pnpm exec tsc --noEmit` passed. The initial production build hit sandbox port restrictions in the Turbopack CSS worker. An elevated production build subsequently passed. No build configuration or application architecture replacement was needed.

Phase 1 had hardcoded dashboard queries, ignored repository scope in several methods, a layout filter strip that could not update page queries, an anonymous fallback identity, and a detail route that fell back to the first RO for unknown IDs. These are corrected for Phase 2. Existing later-phase pages remain foundational implementations; this change does not certify their feature completeness. The pre-existing `/ro/portfolio` sidebar destination has no page in Phase 1; completing that operational page is reserved for Phase 3.

## Implemented routes

- `/ro/dashboard`: current position, annual target, achievement, gap, monthly required run rate, monthly net movement, MTD/YTD flows, monthly reconciliation table, and scoped Superset placeholders.
- `/regional/dashboard`: consolidated authorized region, optional single officer, the same performance sections, searchable/sortable RO comparison, profitability/WACC availability, and scoped chart placeholders.
- `/regional/relationship-officers`: shared authorized comparison table.
- `/regional/relationship-officers/[roId]`: complete selected-RO performance with filters and return-to-all-RO navigation.

Region, RO, date, product and period persist in URL parameters. Pages validate filters before querying. Every repository method independently checks its requested scope against the trusted demo principal. Unknown/off-region officers, mismatched path/query IDs and unauthorized role routes are denied; malformed filters show a correction action. Filter options contain only authorized RO/region choices. Responsive navigation uses a native modal dialog, with Escape and focus restoration. Table overflow is contained and keyboard-accessible.

## Data contract and fixture semantics

`PerformanceRepository` remains the integration boundary. Existing methods are retained; dashboard DTO fields extend the contract with decimal strings, explicit nulls and snapshot metadata. The repository selects static, precomputed outputs from `src/mocks/dashboard-snapshots.json`; it does not calculate sums, ratios, targets, pace, WACC or profit at request time. No database schema, physical view name, driver or SQL was invented.

The 160 synthetic snapshots cover three ROs, Lagos consolidated totals, month-ends January–September 2026, and 15 September 2026 as a provisional partial month. Each supports All Products, Fixed Deposit, Treasury Bills and Sukuk. Abuja has only RO-003. Call Deposit and dates without exact snapshots show an explicit no-data state, not substituted dates or zero balances.

September examples:

| Scope | Closing position | Annual target | Monthly net movement |
|---|---:|---:|---:|
| RO-001 | NGN 800m | NGN 1.2bn | NGN 90m |
| RO-002 | NGN 310m | NGN 500m | NGN 40m |
| Lagos | NGN 1.11bn | NGN 1.7bn | NGN 130m |
| Abuja / RO-003 | NGN 470m | NGN 700m | NGN 70m |

YTD flows are precomputed from nine separate monthly records; portfolio position stays an as-of snapshot. The synthetic pace convention uses months remaining after a completed month, including the current month only for partial snapshots (September month-end uses three months). This corrects Phase 1's four-month constant. It is explicitly an unapproved demo convention. Product-specific target allocation, monthly target allocation, profitability, WACC and weighted yield remain null/pending definition. They are never inferred from unrelated values.

The investment mix shows eligible external inflow by product, a precomputed denominator and percentages. Synthetic rollover principal is excluded. Changing the product filter produces a single 100% composition entry. No frontend chart library or fabricated chart is used. Existing customer/deal fixtures were preserved; their comprehensive alignment with reporting snapshots is later-phase work.

## Authentication and Superset boundaries

Demo login remains intentionally available for synthetic personas; it is not institutional authentication. Anonymous/invalid sessions no longer become RO-001. Cookies are signed, expire, and are HttpOnly/SameSite Lax/Secure in production. `SESSION_SECRET` may be provided through runtime settings for multi-process demos; otherwise a process-local random secret expires sessions on restart. Never use demo persona selection with real banking data. SSO and production session policy remain dependencies.

Superset sections carry the exact effective filter contract and logical chart keys. They show an honest awaiting-connection state, do not fetch/display mock tokens, and make no claim that BI RLS has been verified. Movement, position trend, RO position/target and investment mix placeholders are ready for Phase 4. The target gap is presented in the comparison table as permitted by the specifications. The pre-existing mock guest-token endpoint is not promoted to a production integration by this work.

## Validation

Final local verification on 10 October 2026:

| Check | Result |
|---|---|
| `pnpm lint` | Pass, zero warnings/errors |
| `pnpm exec tsc --noEmit` | Pass |
| `pnpm build` | Pass, Next.js 16.4 Turbopack production build |
| `pnpm test:phase2` | **13 passed** (1.7 minutes) |
| `git diff --check` | Pass |

The 13 tests cover reconciliation of all 160 snapshots and full YTD history; anonymous/forged/edited session cookies; RO/region/role/unknown-ID and conflicting-ID denials; MTD/YTD/date/product parity; refresh/back/reset; regional totals; officer filtering/search/sorting; date-preserving drill-down and return; empty/invalid-filter/logout behavior; private/no-store response headers; six screenshot scenarios; navigation Escape/focus restoration; and control/table geometry at 1440, 1280, 1024, 820, 390 and 320px widths. Browser testing found and fixed a duplicate React key that retained an old comparison table after filter changes.

Screenshots were visually reviewed. This is local Chromium verification, not deployment, institutional SSO, CRM/SQL reconciliation or live Superset RLS verification. Loading and unexpected-error boundaries are implemented; injected repository-outage recovery and other browser engines were not tested.

Browser tests run against `pnpm start` on port 3100 using the production build and local Chrome. Set `CHROME_PATH` if Chrome lives elsewhere. Run `pnpm build` before `pnpm test:phase2`.

Screenshots are saved alongside this report as `ro-desktop.png`, `regional-desktop.png`, `ro-tablet.png`, `regional-tablet.png`, `ro-mobile.png`, and `regional-mobile.png`.

## Outstanding dependencies

- DBA/Finance-approved view contracts, actual source identifiers, decimal units, cutoffs, historical attribution and read-only access.
- Finance approval for target allocations, remaining-month convention, investment mix/rollovers, WACC and profitability.
- Institutional SSO and approved session/authorization policy; replace synthetic personas.
- Phase 4 Superset deployment/version, real dashboard UUIDs, independent view grants, RLS, secure guest-token broker, and verified external filter parity.
- Later-phase operational pages remain outside this delivery. No CRM writes, migrations, account opening, daily/product performance scorecards, activity charts or performance status columns were added.

Stop for stakeholder review before Phase 3.
