# Apache Superset — Self-Hosted Setup and Database Connection

**Status:** Implementation guide and approval checklist, **not** proof that Superset has been installed or that any database connection exists. Superset is a separate service from Next.js.

## 1. Obtain and run Superset

Official references:
- [Superset Quickstart](https://superset.apache.org/user-docs/quickstart/)
- [Docker Compose documentation](https://superset.apache.org/docs/installation/docker-compose/)
- [Installation options](https://superset.apache.org/docs/installation/installation-methods/)
- [Embedding Superset](https://superset.apache.org/user-docs/using-superset/embedding/)

For a **local development/sandbox** environment, use the current official Superset Quickstart on a supported OS, pin an official release and run the supported Docker Compose workflow from its matching release source. Do not paste unknown third-party images/commands or assume latest/main is production-ready. Local Superset **demo credentials are only for isolated development** and must never be used on shared/production deployments.

**Do not deploy the stock development Docker Compose stack directly to production.** Coordinate with bank platform/security teams for a production-grade deployment, TLS, role permissions, secrets, metadata backup, worker/cache availability, monitoring, and upgrades. Apache Superset is not installed automatically by `pnpm install` in the Next.js app.

## 2. Database connectivity

- Determine actual CRM database vendor and supported Superset driver first.
- DBA provides **separate BI read-only credentials** and approved network connectivity to the CRM reporting views or bank-governed replica.
- In Superset add an authorized database connection, then create datasets from the real **approved SQL view names** discovered in `24`.
- Never connect Superset to unrestricted raw CRM customer or transaction tables when the dashboard only needs view-level analytics.
- Grant analysts/viewers only necessary Superset permissions; avoid SQL Lab or sensitive dataset exploration for embedded viewers.
- For each chart/dataset, record the view version, grain, date column, currency semantics, owner and cutoff behavior.

## 3. Proposed RO/Regional dashboard charts

RO: monthly portfolio movement signed bar; month-end portfolio vs approved target; MTD/YTD product investment mix donut; optional approved monthly profitability trend.

Regional Manager: regional monthly net movement bar; closing position trend line; RO position vs target horizontal grouped bar; remaining target gap horizontal bar; MTD/YTD product investment mix donut; optional approved profitability comparison.

**No** daily account opening, standalone product performance/ranking, Recent Activity, dashboard Status badges/charts or Account Opening features.

## 4. Embedded SDK and RLS

1. Enable official embedded-dashboard capability (`EMBEDDED_SUPERSET`) for the pinned Superset version.
2. Restrict allowed embedding origins to configured Next.js app domains; review CSP and HTTPS.
3. Create dashboards and collect **real embedded dashboard UUIDs**; use environment/registry keys, not fabricated UUIDs.
4. In a Next.js **server-side** Route Handler, verify session, assigned region and RO before generating a short-lived guest token; never leak the Superset service credentials.
5. Enforce **row-level security** for each authorized region/RO scope through Superset and, where supported, the DB's native RLS/views. Verify that a user cannot broaden scope using native filters, chart links, exports, SQL Lab or URL manipulation.
6. Align app Region / RO / Date / Product filter values with Superset's *tested and supported* filtering method for this version. If parity is not possible, disable misleading charts pending integration.

## 5. Acceptance checklist

- [ ] Self-hosted Superset instance and version pinned; secured access verified.
- [ ] Production hosting, metadata backup and restoration approved.
- [ ] Only DB reporting views accessible via BI principal.
- [ ] Views and chart metrics reconcile against Next.js for same month, as-of, currency, region, RO and product.
- [ ] RO and manager scoping tested inside charts, drilldowns and downloads.
- [ ] Theme matches Sterling-inspired palette from `06` and `22`.
- [ ] All analytical charts are supplied by Superset, not a substitute React chart renderer.
- [ ] No server-side secret, database password or privileged Superset token included in browser responses.
