# 01 — Scope and approval boundaries

## Existing completed baseline — preserve

- Next.js App Router, TypeScript, pnpm, Sterling-inspired red/charcoal/light-neutral design.
- Relationship Officer dashboard, Regional Manager dashboard and RO comparison; scoped mock repository; six registered Superset dashboards rendered through the existing embedded-SDK wrapper; responsive layout.
- Global **Region, RO, Date, Product** filters placed above dashboard KPIs and visualizations; monthly, MTD and YTD contexts.
- Role/region/RO authorization enforced in trusted server data access (must ultimately also be enforced in Superset).
- Removed under boss's previous review: Daily Performance screen, Account Opening module and today's-account-opened cards, Recent Activity chart, standalone Product Performance scoreboards, dashboard status/rating badges, CRM write operations.
- Production: read-only access to existing CRM tables and approved financial SQL views. Existing self-hosted **Superset 6.1.0** and **read-only SQLite synthetic reporting views** are already present in development.

## Latest discussion — proposals requiring sign-off

| Proposed change | Status | Constraint before proceeding |
|---|---|---|
| CFO role with own finance landing scope and cross-organization RO/RM oversight | **Pending approval** | Specify CFO data boundaries and identity-provider mapping; do not assume unrestricted access |
| RO can change **Role View** filter | **Pending interpretation** | A view-mode selector can change presentation, **never privileges or underlying data access** |
| Regional Manager region selector fixed to assigned region | **Aligned with revised direction; validate authorization mapping** | For multi-region RM, define default and allowed switching, if any |
| Consolidate RO/RM/CFO into a small number of shared dashboard templates | **Pending approval** | Keep role-scoped routing and metrics; avoid proliferating identical dashboards |
| Add Product Analytics dashboard (not historical Product Performance scorecards) | **Pending approval** | Product analytics is composition/trend, not an RO performance leaderboard |
| Save/bookmark preferred filters | **Pending approval** | Per-user ownership, server-side authorization rechecked on recall, no stored tokens |
| Light/dark mode | **Pending approval** | Semantic tokens and Superset embedded theme behavior need testing |
| Replace Phase 2 fixture with 300-record demo | **Pending integration decision** | Stage separately, compare semantics; do not overwrite working mock fixture |

## Recommended minimal dashboard model *if* approved

1. **Performance** — one reusable layout, personalized according to trusted principal and approved role scope. RO default: own book; RM default: own region, region control locked; CFO default: an approved finance view, optional supervised/organization view if permitted.
2. **Product Analytics** — optional shared analytical dashboard filtered by product, time, region and scoped RO; does **not** restore removed Product Performance rankings.
3. Existing operational detail screens (customers, investments, portfolio, reports) remain separate pages; dashboard consolidation does not erase necessary workflows.

## Filter contract under review

- **Role View** (proposed): display mode only, safe choices supplied by server authorization. An RO changing it may switch between permitted lenses of **their own data**; cannot impersonate RM/CFO or inspect another RO's book. Do not trust URL values.
- **Region:** RO bound to assigned region; RM bound to authorized region(s), with region switching only if expressly allowed; CFO boundaries subject to approval.
- **RO:** RO self only; RM officers supervised in authorized regions; CFO authorized aggregate/officer selections when confirmed.
- **Date:** Reporting month/as-of date distinct from MTD/YTD period range; URL stores ISO date, interface can display `30 Sep 2026`.
- **Product:** Authorized products; dataset-side filter must affect *all* matching metrics and charts.
- **Saved filters:** Save `roleView/regionId/roId/asOfDate/productId/period`, *not* user permissions. Revalidate every value against current server-side scope when opening a saved view.

## No authority expansion

An item stated in a recent meeting does not automatically change the signed-off Phase 2 scope or production security. Treat this document as change-request capture, not proof of product-owner approval. The owner must decide and record all items in `07_DECISIONS_AND_DEPENDENCIES.md` before implementation.
