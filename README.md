# Management Information System (MIS)

Existing Next.js App Router application for Relationship Officers and Regional Managers. Phase 2 dashboards use explicitly labelled synthetic data. Phase 3 has not started.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/login` and select a demo persona. Lagos ROs are Adebayo Adeyemi and Chioma Okonkwo; Lagos manager is Babatunde Folorunsho; Abuja manager is Aisha Bello. The demo persona menu also provides Emeka Nwosu (Abuja RO).

Dashboard snapshots cover Jan–Sep 2026 month-ends and 15 September 2026. Default: 30 September 2026. Unavailable dates/products show an empty state. Financial values are precomputed mock reporting outputs, not production calculations.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:phase2
```

Browser tests start the production server on port 3100 and use `/usr/bin/google-chrome`; set `CHROME_PATH` for another Chrome installation. Building first ensures tests use current source and fixtures. Some sandbox environments require permission for local worker/server ports and browser execution.

Optional runtime `SESSION_SECRET` stabilizes signed **demo** sessions across processes. Without it, a random process-local secret invalidates sessions on restart. Production SSO, SQL-view access and Superset are outstanding integrations; do not connect real banking data to demo persona authentication. No runtime secret belongs in source control.

- [Phase 2 implementation, semantics and dependencies](doc/qa/phase2/IMPLEMENTATION.md)
- [Screenshots](doc/qa/phase2/SCREENSHOTS.md)
- [Changed files](doc/qa/phase2/CHANGED_FILES.md)
- [Developer pack](doc/mis/PIS_RO_Developer_Pack/00_README.md)

Review Phase 2 before proceeding to Phase 3.

## Optional isolated v2.1 dataset

The corrected 300-event synthetic dataset can be enabled as a separate development mode. Phase 2 remains the default, and the existing Superset databases and registrations are not changed. See [demo-v2 staging and runtime instructions](dev/demo-v2/README.md).
