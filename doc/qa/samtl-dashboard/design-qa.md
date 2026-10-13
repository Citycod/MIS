# SAMTL monthly dashboard design QA

Reference: `/home/uplix/Downloads/Monthly Performance Dashboard.png`

Implemented evidence:

- `reference-desktop.png` — 1440px desktop comparison with the persistent Relationship Officer sidebar.
- `ro-tablet.png` — 820px responsive layout with the navigation drawer control.
- `ro-mobile.png` — 390px responsive layout with stacked filters.

The MIS implementation preserves the reference hierarchy: SAMTL navigation, Management Information System header, YTD/date context, a single filter card above the analytics, three Superset KPI tiles, the product donut, and monthly inflow chart. The redundant bold “Monthly Performance Review” page heading is absent. The charts are live Apache Superset canvases using synthetic development data.

The CSV import creates an isolated synthetic SQLite reporting database and selects a separately registered Superset dashboard. It does not write to CRM or replace the Phase 2 and demo-v2 data sources. Region and RO values are checked against the authenticated user’s server-side scope before import, and the guest token carries matching RLS clauses.

Validation completed:

- Desktop, tablet, and mobile controls remain within the viewport.
- Desktop retains the requested Relationship Officer navigation.
- Mobile and tablet use the navigation drawer and responsive filter grid.
- Embedded charts render without a Superset error alert.
- CSV-backed charts render to a real Superset canvas.

## Final result

Passed
