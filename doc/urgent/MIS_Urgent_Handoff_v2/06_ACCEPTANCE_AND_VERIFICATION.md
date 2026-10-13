# 06 — Acceptance, QA and rollback gates

## Offline verification of this package

From `doc/urgent/MIS_Urgent_Handoff_v2/`:

```bash
python3 scripts/validate_fixture.py
python3 scripts/verify_cross_format.py --db mis_synthetic_demo_v2.sqlite
python3 scripts/test_reporting_views.py --db mis_synthetic_demo_v2.sqlite
python3 scripts/audit_existing_sqlite.py mis_synthetic_demo_v2.sqlite
```

Expected: 300 unique event IDs, 40 demo customer IDs, 10 source alias references, 3 regions, 12 ROs, 6 products, 30 events per Jan–Oct month, 72 product opening snapshots, 12 RO targets; 720 monthly RO/product rows; 120 monthly RO position rows; no negative demo closing balance; reporting row reconciliation.

The `scripts/build_isolated_sqlite.py` script is **not needed** to inspect the bundled demo database. Running it with default args will fail intentionally because the bundled database already exists. To test fresh creation, choose a **new unused path** (e.g. `/tmp/mis_sqlite_fresh_review.sqlite`).

## Review gates

**Gate A — static compatibility (no code change):**
- Existing Next.js Phase 2 still passes `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` and relevant tests.
- Existing Superset 6.1.0 installation and six embedded-dashboard registrations remain intact; no destructive operations.
- Source/data demo QA outputs attached to the review, no real CRM datasets imported.
- Approval table in `07_DECISIONS_AND_DEPENDENCIES.md` completed or proposed changes deferred.

**Gate B — isolated demo Superset charts (requires approval):**
- Demo-only SQLite is attached as separate read-only source; existing Superset metadata and synthetic database unaffected.
- Chart 1 monthly movements reconciles `opening + new inflows − withdrawals = closing` for every month/RO/product.
- Chart 2 closing position uses month-end snapshots, not cumulative sums across months.
- Chart 3 grouped RO actual vs **annual** target labels are clear.
- Chart 4 MTD/YTD product mix percentages reconcile and respect period-as-of date.
- Example unauthorized user cannot access another region/RO via embed or bookmark; independent Superset RLS verified, not inferred from frontend.
- Charts render on desktop/tablet/mobile; no Superset placeholder silently replaced by fake React charts.

**Gate C — new role/filter/theme features (requires explicit business + security sign-off):**
- CFO finance default/organizational data scope precisely defined, with denied cases and direct URL tests.
- Role View modifies presentation only and never grants underlying access.
- RM region fixed to authorized region; RO selector constrained to that region.
- Saved filters restore safely, sanitized, reauthorized at read time, and survive revoked RO access without leakage.
- Dark and light mode contrast meets WCAG 2.2 AA where practicable, persists preference and does not break embedded analytics.
- Product Analytics screens are explicitly approved and do not restore removed Product Performance scorecards.

## Isolation & rollback

- Commit current Phase 2 baseline and record Superset dashboards/database config **before any authorized change**.
- New demo DB has a distinct filename and is read-only; remove only that *newly registered* demo Superset database/datasets if rolling back.
- Do not mutate existing 6.1.0 Superset metadata, dashboard UUIDs or original SQLite files.
- Feature flag proposed UI features and restore existing routes/fixtures if tests fail.
- Never promote any demo-derived calculation views to production without DBA/Finance review.

**Cross-format gate (mandatory):** `verify_cross_format.py` compares *every field* for 300 event records, 72 opening positions, and 12 targets among CSV/XLSX/SQLite, plus the 10 aliases across CSV/XLSX. It fails on amount mismatches, missing/duplicate keys, or total differences. The approved demo expectation is **NGN 3,960,000,000.00** opening position; this is a synthetic fixture, not a Finance-approved account value.

**Fresh-build test:** `python3 scripts/build_isolated_sqlite.py --output /tmp/mis_review_unique.sqlite` and `python3 scripts/test_reporting_views.py --db /tmp/mis_review_unique.sqlite` and `python3 scripts/verify_cross_format.py --db /tmp/mis_review_unique.sqlite` (choose an unused path). The reporting test must never silently fall back to the bundled SQLite.
