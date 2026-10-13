# MIS Phase B implementation handoff

Implemented 12 October 2026. **Post-change verification is deferred at the user's explicit instruction to finish the work without running tests.** This is an implementation handoff for stakeholder review, not a claim that browser acceptance has passed.

## Implemented behavior

- One shared PerformanceDashboard remains behind RO, Regional Manager, comparison, and authorized officer drill-down routes.
- Global controls appear beneath the heading: Role View, Region, Relationship Officer, Date, Product, Period. Layout uses one, two, three, or six columns depending on available viewport width. Locked controls retain disabled styling and accessible explanatory text.
- Role View is a server-normalized presentation lens. Portfolio Overview keeps the existing flow-first layout; Investment Breakdown moves charts above the flow summary and investment mix first; Monthly Movement moves charts and the movement table ahead of the flow summary.
- KPI cards remain above the lens-specific sections. Section order changes in the DOM, preserving reading and keyboard order.
- MTD/YTD has one interactive control in the global bar. It applies the current Date/Product/RO/lens draft together. Chart sections display the applied period without independent switches.
- Applying filters replaces financial results with a loading state until the server response arrives. Chart components unmount, abort requests, and obtain scoped credentials for the new effective filter state. Invalid filters return an error without dashboard records; unauthorized requests retain the existing denied response.
- RO Region and officer are locked. RM Region is locked in both options and server authorization; selecting an entitled officer or All ROs retains the assigned Region.
- Reporting-date suggestions come from the active existing data catalog. Invalid calendar dates fail validation; well-formed dates without an exact reporting snapshot retain the existing no-data behavior.
- Existing repository methods, financial definitions, authentication, signed guest-token RLS, registries, UUIDs, and data-mode selection remain in place. No migration or Superset resource replacement was made.

## Inspection and Phase A evidence

Inspected the shared dashboard/filter components, filter contract, server session and scope enforcement, repository interface/factory/adapters, RO/RM routes, Superset wrapper/broker, registry selection, and provisioning definitions. Reviewed a contact sheet of all 14 UI references. Preserved the established Sterling red/charcoal styling.

Phase A navigation is present in the starting worktree, including the consolidated sidebar, disabled planned destinations, RO portfolio redirect, and a navigation regression scenario in `tests/phase2/dashboards.spec.ts`. Only `doc/qa/phase-a/before/` screenshots were present. No standalone consolidation audit or Phase A completion/test-results report was found; the consolidation proposal in `doc/urgent/MIS_Urgent_Handoff_v2/01_SCOPE_AND_APPROVALS.md` was reviewed. Phase A completion evidence remains a gap. Sidebar code was not changed for Phase B.

The worktree already contained extensive Phase 2/demo-v2/Phase A changes. The file list below describes this task's changes only.

## Filter contract

See [FILTER_CONTRACT.md](FILTER_CONTRACT.md) for defaults, URL semantics, authorization, and the permission matrix.

## Superset filter parity and known convention

Repository calls and all embeds receive the same normalized filters. Presentation configuration receives only `roleView`; it cannot select a principal, region, officer, dataset, or resource. The existing broker accepts the additive allowlisted filter key and normalizes it, but its SQL/RLS clauses do not read Role View. Registry selection still depends only on trusted server data mode.

The existing demo-v2 comparison chart uses `MAX(closing_position_ngn)` grouped by officer. Under YTD it represents the maximum monthly position in the reporting window; the comparison table represents the selected closing snapshot. A visible chart description now explains this convention. It has not been silently relabelled as a matching closing balance or changed through new formulas, permissions, or resources. Stakeholders must decide whether a future approved chart change should align that convention.

Baseline SQL reconciliation completed: `python3 dev/superset/verify_reporting.py` reported **320 complete reporting scopes reconcile; read-only database connection rejects writes**. This is existing Phase 2 source reconciliation, not post-change live chart/browser parity proof.

Existing Superset suites retain chart queries, signed RLS/security checks, and date/product/period coverage. Added a regression to both suites comparing decoded authorization claims and actual movement records across all three lenses and forged Role View values. These additions have **not been executed**.

The registry files were read only. Their initial SHA-256 fingerprints were:

- Phase 2 registry: `4a3fe136c0c5d5ac405a7e2730286cc05b04e50d926cedfa62db9f7013d288a3`
- Demo-v2 registry: `f57fc42e28883cd5e9e685cd6a7ba70459085e1e2f3335ad8b5531aab8b7c046`

No registry contents, credentials, or tokens are included in this handoff.

## Verification status

| Check | Recorded result |
|---|---|
| Baseline `pnpm lint` | Passed before implementation |
| Baseline `pnpm exec tsc --noEmit` | Passed before implementation |
| Baseline `pnpm build` | Compilation and route-generation output produced; command interrupted when testing was stopped. An overlapping build attempt reported an existing build lock. No clean build exit is claimed. |
| Baseline `pnpm test:phase2` | Did not reach tests: configured local web server could not start in the sandbox |
| Baseline `pnpm test:demo-v2` | Did not reach tests: configured local web server could not start in the sandbox |
| Baseline reporting reconciliation | Passed, 320 scopes |
| Post-change lint, typecheck, build, regression suites | Not run at user's instruction |
| Complete Superset and demo-v2 Superset suites | Not run |
| Phase B desktop/tablet/mobile screenshots | Not captured; earlier screenshots are not Phase B evidence |

New `tests/phase2/phase-b.spec.ts` covers lens/record invariance, forged lens values, ambiguous primary assignment, RM locks and aggregation, common Date/Product/Period state, browser refresh/history, denied/invalid states, and control bounds at 1440/820/390 pixels. It defines RO/RM screenshots under this directory for a later authorized verification run. Tests were authored but not run.

## Files changed for Phase B

- `src/types/filter.ts`: additive optional RoleView field and allowlisted type; existing repository callers remain compatible.
- `src/types/auth.ts`: document Region lock for both supported roles.
- `src/lib/filters.ts`: stable lens allowlist/default/normalizer and URL key.
- `src/lib/server/security/primary-region.ts`: explicit primary-region resolution with no entitlement-order fallback.
- `src/lib/server/security/scope.ts`: enforce assigned Region for both roles and normalize presentation value.
- `src/lib/server/security/filter-options.ts`: offer only assigned Region and its entitled officers; reporting dates.
- `src/lib/server/repository/data-catalog.ts`: publish existing snapshot dates for filter suggestions.
- `src/lib/server/dashboard-presentation.ts`: presentation-only section/chart ordering.
- `src/components/filters/global-filter-bar.tsx`: unified controls, lock explanations, pending-result replacement.
- `src/components/dashboard/performance-dashboard.tsx`: apply presentation configuration, reuse chart sections, remove repeated period controls, label demo-v2 YTD comparison convention and snapshot version.
- `tests/phase2/phase-b.spec.ts`: new unexecuted browser/authorization coverage.
- `tests/superset/charts.spec.ts`, `tests/superset-demo-v2/charts.spec.ts`: new unexecuted Role View RLS/record invariance coverage.
- `doc/qa/phase-b/IMPLEMENTATION.md`, `doc/qa/phase-b/FILTER_CONTRACT.md`: implementation and contract handoff.

## Remaining decisions

1. RM identities without an explicit valid primary Region fail closed. Stakeholders must approve any policy for ambiguous multi-region assignment before such identities can be supported.
2. Decide the future demo-v2 YTD comparison convention described above.
3. CFO identity/entitlements, Finance definitions for unsupported metrics, and subsequent features remain outside Phase B.
4. Browser acceptance, screenshots, and post-change verification remain outstanding because the user stopped test execution. Review Phase B before any further feature work.
