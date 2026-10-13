# 02 — Dataset and source audit

## Verified origin

The original uploaded CSV (`source_reference/Original_10_Row_Sample.csv`, received as `Mr okoro john doe(1).csv`), contains a 2025 sample profitability-style table, with 10 customer aliases in **data rows 3–12**, and header labels such as INFLOW/ROLLOVER, INT. RATE/ANNUM, POOL RATE, TENOR and MARGIN. These are *historical illustrative source values*, not production calculations and not sufficient to reconstruct a trusted banking transaction history.

The original file does **not** contain Region, Product, RO ID, or a 2026 monthly transaction ledger. All new 2026 dates, regions, products, ROs, balances, targets, event types and amounts are intentionally synthetic. We reuse all **10 source alias labels** by their original data row numbers only as a lineage cue. We do not claim the source itself has 40 customers.

## Supplied synthetic tables

| File | Rows | Business meaning | Provenance |
|---|---:|---|---|
| `mis_300_synthetic_events.csv` | 300 | Distinct synthetic investment events | Generated deterministically using seed 20261012 |
| `mis_synthetic_starting_positions.csv` | 72 | 12 ROs × 6 product opening snapshots on 2025-12-31 | Explicitly independent demo assumptions |
| `mis_synthetic_ro_targets.csv` | 12 | One annual target per demo RO for 2026 | Explicitly independent demo assumptions |
| `source_aliases.csv` | 10 | Source CSV data row number → customer alias | Transcribed from uploaded CSV |
| `MIS_300_Synthetic_Demo_Data_v2.xlsx` | Multiple sheets | Same records, no authoritative finance formulas | Reviewable only |

### `mis_300_synthetic_events.csv` columns

`event_id` unique synthetic identifier; `event_date` ISO date; `region_id` and `region`; `ro_id`, `ro_name`; `customer_id` (40 distinct), `customer_name` (alias plus explicit Demo suffix); `product` (6 distinct); `event_type` (NEW_INFLOW, ROLLOVER, WITHDRAWAL, MATURITY); `transaction_amount_ngn` (raw positive amount); `customer_rate_pct` (illustrative nominal rate); `tenor_days`; `source_sample_row` (3–12); `currency` (NGN); and `data_classification` (SYNTHETIC_DEMO_ONLY).

**No calculation_base, pool_rate, WACC, WHT, OPEX or margin fields are emitted.** The source contains questionable accrual-day fields; those are not copied into the new fixture. `Shyta` and `Sira` are provisional unverified names from the later user instruction, not the original CSV. Confirm master-product IDs and exact spelling before production mapping.

## Verification outcomes

- Exactly **300 events**, **300 unique event IDs**, **40 synthetic customer IDs**, **10 distinct source aliases** and **10 distinct `source_sample_row` values (3–12)**.
- 100 events in each of **Lagos, Abuja, Port Harcourt**; 12 synthetic ROs, 6 provisional/demo products.
- Exactly 30 records in each of January through October 2026; October is **partial through 10 October**, matching the sample handoff snapshot date.
- Every raw event has a **positive** amount. Demo SQL defines `NEW_INFLOW` as positive external movement, `WITHDRAWAL` as negative external movement; rollover and maturity are tracked separately but do not imply balance changes until Finance signs off.
- 72 RO/product opening snapshots, 12 targets, and a complete 120-row monthly RO position view. The view produces no negative demo balances.
- Synthetic amounts and targets are **not reconciled to the original 2025 workbook** and must never be represented as actual financial results.

## Critical finance warning

The original source's implied Calculation Base and other interest calculations were inconsistent/unapproved. **Do not regenerate them from simplistic assumptions** such as amount × 1.18 or a constant pool rate. Even the illustrative SQL views in `mis_demo_views.sql` are *demonstration conventions*, not authoritative bank policy.

## Regenerate/validate

```bash
cd doc/urgent/MIS_Urgent_Handoff_v2
python3 scripts/validate_fixture.py
# Only if intentionally regenerating an isolated local demo:
python3 scripts/generate_fixture.py
python3 scripts/validate_fixture.py
```

Re-running the generator rewrites only the packaged **synthetic CSVs**. It must not be pointed at production CRM data. Excel and the prebuilt SQLite fixture are the verified snapshots bundled with this handoff; regenerate/rebuild only when a deliberate new version is planned.

## v2.1 cross-format correction

The v2 ZIP mistakenly shipped 72 starting-position CSV amounts fixed at NGN 150,000,000 while the generator, workbook and bundled SQLite used varying NGN 40–70 million amounts. The **corrected synthetic fixture** uses the generator/XLSX/SQLite 72-row values and totals **NGN 3,960,000,000**, never NGN 10,800,000,000. Every CSV row is verified against corresponding workbook and SQLite records by `scripts/verify_cross_format.py`. This is a technical consistency correction, *not* evidence that the demo balances are financially approved.
