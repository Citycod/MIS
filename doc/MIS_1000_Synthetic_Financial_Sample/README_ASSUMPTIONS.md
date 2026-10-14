# MIS synthetic sample — 1,000 events

This is **entirely synthetic demonstration data**, not Oracle Symplus or approved financial reporting.

- 300 original synthetic CSV records retained; 700 additional synthetic records generated.
- 1,000 event records; 720 monthly RO/product rows; 120 monthly RO rows; 10 monthly/YTD organization summaries.
- Region, RO, product, dates, and customer identities are illustrative.
- Original 300 rows contain repeated customer name `niisssn` and synthetic 24% pool rates. Preserved for lineage.
- Generated rows use synthetic calculation_base = transaction_amount × 1.18, but the reporting summaries DO NOT use that base.
- Withdrawal and maturity amounts are positive in raw records but subtract from portfolio movement. Rollover does not count as new external inflow and has zero net movement.
- Opening balance ASSUMED ₦150m per RO/product, total ₦10.8bn; annual target ASSUMED ₦1.2bn per RO, total ₦14.4bn. These are NOT source data.
- Closing positions are snapshots: never sum closing balances over multiple months.
- Simple interest estimates: amount × rate × tenor_days / 365, no compounding, taxes, fees, accrual timing or recognized profit.
- Tenor interest margin is a synthetic rate-spread illustration, **not profitability**. Source pool rate is unapproved.
- Position/target percentage is NOT an official funds mobilized achievement rate.
- October summary covers the **entire month**; it is not an October 12 as-of report.
- Do not import into production Symplus, CRM, or overwrite current Superset dashboards. Stage in isolated demo reporting tables.
- Financial policies, Oracle view definitions, account/deal semantics, and authorization remain subject to Finance/DBA approval.
