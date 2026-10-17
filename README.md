# Management Information System (MIS)

Existing Next.js App Router application for Relationship Officers and Regional Managers. Phase 2 dashboards use explicitly labelled synthetic data. Phase 3 has not started.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/login` and sign in with an activated staff ID and local password. On a controlled first start, configure `MIS_BOOTSTRAP_ADMIN_USER_ID`, `MIS_BOOTSTRAP_PASSWORD` and `MIS_IDENTITY_ENCRYPTION_KEY`. Outside production, an omitted bootstrap password is generated once and written to the ignored `.local/mis-identity/bootstrap-credentials.txt` file with owner-only permissions. It must be changed at first sign-in.

Dashboard snapshots cover Jan–Sep 2026 month-ends and 15 September 2026. Default: 30 September 2026. Unavailable dates/products show an empty state. Financial values are precomputed mock reporting outputs, not production calculations.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:phase2
```

Browser tests start the production server on port 3100 and use `/usr/bin/google-chrome`; set `CHROME_PATH` for another Chrome installation. Building first ensures tests use current source and fixtures. Some sandbox environments require permission for local worker/server ports and browser execution.

Authentication uses stable internal MIS user IDs, scrypt-protected local credentials and opaque, revocable server sessions. Financial roles and organizational assignments remain independent of the authentication provider. Microsoft Entra ID, Odoo federation, enterprise OIDC and enterprise SAML are reserved but disabled until approved configuration and security validation are complete. No runtime secret belongs in source control.

- [Identity runtime, bootstrap and future provider boundary](dev/identity/README.md)

- [Phase 2 implementation, semantics and dependencies](doc/qa/phase2/IMPLEMENTATION.md)
- [Screenshots](doc/qa/phase2/SCREENSHOTS.md)
- [Changed files](doc/qa/phase2/CHANGED_FILES.md)
- [Developer pack](doc/mis/PIS_RO_Developer_Pack/00_README.md)

Review Phase 2 before proceeding to Phase 3.

## Optional isolated v2.1 dataset

The corrected 300-event synthetic dataset can be enabled as a separate development mode. Phase 2 remains the default, and the existing Superset databases and registrations are not changed. See [demo-v2 staging and runtime instructions](dev/demo-v2/README.md).
