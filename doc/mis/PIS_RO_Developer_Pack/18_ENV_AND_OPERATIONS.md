# Environments, Deployment and Operations — Direct Database + Self-Hosted Superset

## Supported environments

- **Local demo:** Next.js with deterministic `MockPerformanceRepository`; explicitly labeled **Synthetic demo**. Optional local self-hosted Superset shows “not connected” until configured. No real bank records.
- **Staging:** approved sanitized or bank-governed data; read-only approved database views; SSO/test region entitlements; self-hosted Superset with RLS and dashboard UUIDs.
- **Production:** approved CRM database/replica readonly account, finance views and cutoff, bank auth, secured Superset hosting, audit/monitoring, report/export permissions.

## Illustrative `.env.example` (values are placeholders, never credentials)

```dotenv
# Nonsecret browser configuration only
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SUPERSET_EMBED_ORIGIN=https://superset.example.invalid
NEXT_PUBLIC_FEATURE_PROFITABILITY=false

# Server only — NEVER NEXT_PUBLIC_ and NEVER commit actual credentials
CRM_DB_ENGINE=<TBD_DATABASE_VENDOR>
CRM_DB_HOST=<private-DNS-from-DBA>
CRM_DB_PORT=<approved-port>
CRM_DB_NAME=<approved-database>
CRM_DB_USERNAME=<readonly-PIS-principal>
CRM_DB_PASSWORD=<secret-manager-reference>
CRM_DB_SSL_MODE=<approved-TLS-policy>
CRM_DB_POOL_MAX=<DBA-approved-concurrency>
PIS_AUTH_SESSION_SECRET=<secret-manager-reference>
SUPERSET_BASE_URL=https://superset.internal.example.invalid
SUPERSET_SERVICE_ACCOUNT_SECRET=<secret-manager-reference>
```

**Do not use** obsolete `CRM_API_BASE_URL`, `CRM_API_AUTH_MODE` or `PIS_KPI_API_BASE_URL`. Database engine, driver, SQL dialect and physical view identifiers are TBD; choose actual library and config only after `24` sign-off. Connection strings and passwords must never enter client code, public assets or Next.js build output.

## Execution and network

- Next.js must run on a supported **Node/server runtime** for DB drivers; not static export or Edge-only routes. Create DB pool in `server-only` modules, bounded by approved pooling limits.
- Database security team approves private connectivity, allowlisted egress, TLS, read-only grants, query timeouts and identity rotation.
- App server may read approved CRM operational tables/views. Self-hosted Superset runs separately with its **own DB read-only principal** limited to reporting views; metadata DB is independent from CRM.
- Never treat an SQL view as automatically secure: test source grants, view execution identity, regional RLS and whether direct detail access bypasses intended filters.
- Use Next.js authenticated dynamic/private response behavior for sensitive data and guest tokens; do not permit public shared caching.

## Self-hosted Superset lifecycle

- Local/dev download/install via official Quickstart or Docker Compose instructions; **not a production-ready deployment by default**.
- Production deployment must be approved for image/version pinning, TLS/reverse proxy, allowed embed origins, guest-token signing, RLS, secret storage, metadata backup, recovery and monitoring.
- Create datasets from **verified finance-approved SQL reporting views** and register real embedding UUIDs under logical keys; no guessed dashboard IDs.
- See `26_SUPERSET_SELF_HOSTED_SETUP.md` and `09_SUPERSET_ANALYTICS_AND_CHART_CATALOG.md`.

## Monitoring and data freshness

- Observe DB connectivity/pool saturation, query duration and timeouts, missing view/grant, query errors, reporting cutoff, monthly reconciliation, Superset token failures and mismatched chart values.
- Log safe correlation IDs, selected **authorized** scope IDs and definition versions as approved; never log bank details, raw SQL values or secrets.
- Expose `asOf`, reporting month, data/view version, and provisional cutoff **only if source view metadata provides it**.
- Suppress financial KPIs when definitions are unsigned or views missing; a database failure is not “zero portfolio.”
- An absent Superset instance must show honest placeholder; do not draw replacement React charts.

## Production release checklist

- [ ] CRM database engine/schema confirmed; actual table/view catalog and source ownership documented (`24`).
- [ ] Database app and Superset accounts have minimum read-only grants; no client-visible secrets.
- [ ] Finance approves all active calculated views; unsupported metrics hidden.
- [ ] Staff→RO→region entitlements and effective history tested with actual data.
- [ ] Server-side SQL uses bound parameters, allowlisted identifiers, bounded result sizes and approved DB pool settings.
- [ ] Self-hosted Superset version pinned, metadata backups and recovery verified; RLS tested.
- [ ] Top Region/RO/Date/Product filters reconcile cards, charts, tables and exports.
- [ ] No Daily Performance, Account Opening, Recent Activity, standalone Product Performance or dashboard Status features.
- [ ] DB outage, Superset outage, rotated credentials, cutoff mismatch and report failures gracefully handled.
- [ ] Mock/demo mode cannot activate silently in production.
- [ ] Staging/UAT and rollback plan approved; see `25`.
