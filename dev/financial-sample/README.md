# Isolated 1,000-event financial sample

This source is separate from Phase 2, demo-v2, and the nine-column CSV dashboard importer. It imports the supplied 34-column event file into `.local/mis-financial-sample/reporting.sqlite` with append-only source versions, raw-row provenance, versioned migrations, and an explicit reporting cutoff.

```bash
python3 dev/financial-sample/import_sample.py --cutoff 2026-10-10
bash dev/superset/provision_financial_sample.sh
bash dev/superset/provision_mpr_dashboards.sh
```

The source product remains on every row. `product-mapping.json` applies the user-directed SAMTL presentation catalogue in a separate derived layer. `MAPPED_DEMO` means a synthetic presentation mapping; it does not claim production business equivalence. `SAMTL REIT` remains in the catalogue but has no source rows in this sample. Unknown future source products are retained as `UNMAPPED` and excluded from mapped product allocation charts.

The shared SQL views implement the PDF formula chain. Only `NEW_INFLOW` events enter the isolated deal-accrual scenario because the sample cannot link rollovers, withdrawals, or maturity events to a reliable investment lifecycle. Event reporting still includes all event types. The reporting views retain all 1,000 rows but exclude dates after the active cutoff from as-of calculations.

Demo assumptions are stored in `financial_reporting_settings`: 365-day basis, effective date excluded, 10% illustrative WHT, 2% illustrative OPEX as a share of interest income, ₦150m opening position per RO/source-product, ₦1.2bn annual target per RO, calendar-day daily run rate, and rollover reported separately from active deals. These settings are not production policy.

Key views:

- `v_financial_events_mapped` and `v_financial_events_as_of`
- `v_financial_monthly_movement`
- `v_financial_deal_metrics`
- `v_financial_monthly_deal_accrual`
- `v_financial_monthly_profitability`
- `v_financial_rate_summary`
- `v_financial_current_position`
- `v_financial_target_run_rate`
- `v_financial_superset`

Do not sum position rows across reporting periods. `v_financial_current_position` is one as-of snapshot at the configured cutoff.
