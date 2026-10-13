# Superset 6.1.0 — existing integration compatibility notes

This handoff is NOT a Superset chart export, import bundle, RLS policy, or deployment guide. It never installs Superset, migrates PostgreSQL, or overwrites existing SQLite reporting datasets.

## Verified current implementation

- Apache Superset **6.1.0** is installed in the repository's isolated `.local/superset-venv/` environment.
- Superset metadata and the existing synthetic reporting source remain separate at `.local/superset/metadata.db` and `.local/superset/synthetic-reporting.db`. The reporting database exposes `dev_synthetic_movement`, `dev_synthetic_position`, `dev_synthetic_mix`, and `dev_synthetic_comparison` read-only views.
- The application uses `src/lib/server/superset/guest-token.ts` through `src/app/api/superset/guest-token/route.ts`. It is enabled locally by `PIS_SUPERSET_LOCAL_ENABLED`; the `PIS_` prefix remains a legacy *internal* compatibility identifier, while user-facing branding is **MIS**.
- `.local/superset/registry.json` contains six existing registrations: RO movement, RO position, regional movement, regional position, regional RO position/target comparison, and investment mix. Preserve their dashboard UUIDs and dataset mappings; never copy credentials or tokens into documentation.
- `src/components/superset/superset-dashboard-placeholder.tsx` invokes the actual Embedded SDK when filters are present. Its historical filename does not describe a static placeholder-only implementation.
- The server broker validates the signed application session, dashboard role and authorized Region/RO/Date/Product/MTD-YTD filters. It issues a short-lived guest token for one registered dashboard with a signed Superset RLS clause containing the exact effective scope. Dashboard viewers do not need individual Superset accounts.
- The restricted `MIS Token Broker` role holds only `can_read` and `can_grant_guest_token` on `SecurityRestApi`. The `MIS Embedded` role includes the minimum dashboard/chart/dataset permissions and `can_read` on `CurrentUserRestApi`; it has no SQL Lab, export, edit or token-issuance grant.

## Resolved HTTP 403

The earlier Next.js `POST /api/superset/guest-token` 403 came from comparing the browser Origin with the wrong request-origin representation. The route now compares the parsed Origin host with the actual HTTP Host header while continuing to reject cross-origin requests.

The embedded Superset `/api/v1/me/roles/` 403 came from the restricted guest role lacking `can_read` on `CurrentUserRestApi`. The narrowly scoped permission is now provisioned in `dev/superset/bootstrap.py`. A live loopback verification on 12 October 2026 returned HTTP 200 for Superset health, broker login, CSRF acquisition, guest-token issuance, `/api/v1/me/roles/`, and the embedded dashboard route. No broad Gamma/Admin grant or configuration replacement was required.

## Safe Codex audit steps

1. Inspect installed Superset 6.1.0 health and *actual* service address. Record non-secret version and UUIDs; never paste tokens.
2. Read the actual registry schema and guest-token broker implementation. Confirm filter embedding routes and guest-token claims.
3. If a 403 recurs, distinguish the Next.js origin check from Superset endpoint permissions before changing configuration. Verify per-role and per-region authorization at Superset without widening the existing restricted roles.
4. Keep real operational data out of fixtures; register the bundled demo DB only as **additional** isolated source after owner approval.
5. When business approvals exist, provision Superset charts in this already-installed version, capture exports and RLS configs in separate deployment artifacts, and verify that filters and SQL reporting views reconcile.

## Missing artifacts (explicitly not supplied)

- No chart/dashboard JSON export, dataset registry export, RLS provisioning file, scripted chart provisioning, or credentials.
- No integration with production CRM views or production identity provider.
- CFO/Role View/Product Analytics/saved views/themes are **approval-gated**, not implicitly implemented.
