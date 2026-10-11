# Local synthetic Apache Superset

This setup is exclusively for local dashboard development. It does not connect to CRM or define production reporting objects. The existing `MockPerformanceRepository` remains the source of the application's KPI cards and tables.

## Run

From the repository root:

```sh
bash dev/superset/setup.sh
# Add PIS_SUPERSET_LOCAL_ENABLED=true to .env.local, preserving other settings.
bash dev/superset/run.sh
# In a second terminal:
pnpm build
pnpm start --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100 and choose a demo RO or Regional Manager. Superset runs separately at http://127.0.0.1:8088. Allowed embed origins are localhost and 127.0.0.1 on ports 3000 and 3100. Stop either service with Ctrl+C. Rerun setup to restore datasets/charts deterministically; it preserves generated credentials and existing embed UUIDs.

The workspace uses isolated Python 3.11.17, Apache Superset 6.1.0, and the fully pinned `requirements.lock.txt`. Rich is explicitly included for Superset's CLI; Flask-Caching is pinned to 2.3.1 because 2.5.1 changes the private method signature used by this Superset release. Setup needs network access to official Python/PyPI distributions. No Docker, global Python installation changes, or frontend chart library are required.

All generated data, metadata, credentials, interpreters, caches and the real embed registry live in ignored `.local/`. `secrets.json` is generated with restricted permissions and is never printed. The Next.js server reads this registry and the restricted broker credential only when `PIS_SUPERSET_LOCAL_ENABLED=true`. This explicit opt-in also works with a local production Next.js build; do not set it for a bank deployment. No credentials are embedded in browser bundles. Local administrator username: `pis-local-admin`; its generated password remains in `.local/superset/secrets.json`.

## Reporting contract

`seed_reporting.py` imports `src/mocks/dashboard-snapshots.json`. The four `dev_synthetic_*` SQL views are development objects in a separate SQLite reporting database. Superset opens that file with `mode=ro`; its metadata database is a different file.

Every row has region, an exact sorted RO-set `scope_key`, reporting cutoff, product filter, and MTD/YTD period. Separate precomputed regional snapshots avoid adding individual and consolidated balances together. All financial values come from the fixtures. The movement view adds a signed presentation of withdrawals; the underlying fixture amount stays positive. Chart `MAX` metrics select the one fixture value at the intended grain, never sum balances over months.

| View | Additional grain | Values |
| --- | --- | --- |
| `dev_synthetic_movement` | Reporting month | Inflows, signed withdrawals, net movement |
| `dev_synthetic_position` | Reporting month | Closing position, existing annual position target |
| `dev_synthetic_mix` | Product | Eligible investment and precomputed percentage |
| `dev_synthetic_comparison` | RO | Officer position and annual target |

For YTD history, prior month ends plus the exact selected cutoff are imported; a partial-month snapshot does not also include that month's later closing snapshot. The September 15 provisional snapshot follows the same repository selection rule. Product targets remain null. An annual target is explicitly labelled an annual reference, not a monthly allocation; the regional trend displays closing position only. Approved monthly targets, profitability and WACC remain unavailable.

The existing layout requires three chart panels for ROs and four for managers. Six actual single-chart Superset dashboards back these reused slots, with no additional KPI iframes or changes to panel ordering. The charts use Superset's ECharts plugins internally; no analytical renderer is added to Next.js. Sterling red/charcoal/gold colours are configured in Superset itself.

## Authorization and filtering

1. The Next.js token broker verifies the signed app session, dashboard role, region and RO membership using the existing scope normalizer. It validates all filter types and values.
2. A restricted `MIS Token Broker` service account can read a CSRF token and issue guest tokens. It cannot read financial datasets or use SQL Lab. The administrator is not used by the application.
3. A five-minute guest token allows one real embedded UUID. Its global RLS clause restricts `region_id`, the exact authorized `scope_key`, `as_of_date`, `product_filter`, and `period_mode`. Superset includes guest RLS in its query/cache security. Removing client query filters cannot remove the signed clause.
4. The `MIS Embedded` role has only the minimal read/chart permissions needed for the assigned dashboard. It has no global database/dataset access, export, SQL Lab, edit or guest-token issuance rights. The Public role receives no grants. Dashboard membership controls dataset access.
5. On a URL filter change the embed unmounts and requests a new scoped token. Superset native/cross-filters are disabled, so they cannot diverge from the global application filter. SDK token refresh revalidates the active app session. Failed token refresh removes the frame.
6. Superset embedding domains and CSP frame ancestors restrict parent origins. CSRF remains enabled. Neither admin credentials nor broker bearer tokens reach the browser.

The demo persona selector remains development authentication. Production requires bank SSO, authoritative entitlements, a hardened hosted Superset service, reviewed database roles and approved CRM views. Local SQLite metadata is disposable; this is not a production deployment blueprint.

## Verify

```sh
python3 dev/superset/verify_reporting.py
pnpm lint
pnpm exec tsc --noEmit
pnpm build
# With Superset and Next.js already running:
pnpm exec playwright test --config playwright.superset.config.ts
pnpm test:phase2
```

The integration suite calls Superset using actual guest tokens, checks fixture parity and malicious scope changes, and captures desktop/tablet/mobile chart screenshots. Browser traces are disabled for this suite so token-bearing network requests are not persisted. See `doc/qa/superset/` for the recorded execution results and limitations.

Official references: [installation](https://superset.apache.org/admin-docs/installation/pypi/), [embedding](https://superset.apache.org/user-docs/6.1.0/using-superset/embedding/).
