CREATE TABLE mpr_account_opening_targets (
  reporting_year INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  ro_id TEXT NOT NULL,
  annual_account_target INTEGER NOT NULL CHECK (annual_account_target > 0),
  data_classification TEXT NOT NULL CHECK (data_classification = 'SYNTHETIC_DEMO_ONLY'),
  PRIMARY KEY (reporting_year, team_id, ro_id)
);

CREATE TABLE mpr_account_openings (
  account_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  region_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  ro_id TEXT NOT NULL,
  ro_name TEXT NOT NULL,
  account_opening_date TEXT NOT NULL,
  product TEXT NOT NULL,
  account_category TEXT NOT NULL,
  reporting_year INTEGER NOT NULL,
  source_classification TEXT NOT NULL CHECK (source_classification = 'SYNTHETIC_DEMO_ONLY')
);

CREATE INDEX idx_mpr_account_openings_scope_date
  ON mpr_account_openings(region_id, ro_id, account_opening_date);

INSERT INTO mpr_account_opening_targets(
  reporting_year, team_id, ro_id, annual_account_target, data_classification
)
SELECT y.reporting_year, officers.region_id, officers.ro_id,
  96 + (officers.officer_order % 4) * 12,
  'SYNTHETIC_DEMO_ONLY'
FROM (
  SELECT region_id, ro_id,
    ROW_NUMBER() OVER (ORDER BY region_id, ro_id) AS officer_order
  FROM (
    SELECT DISTINCT region_id, ro_id FROM financial_investment_events
  )
) officers
CROSS JOIN (SELECT 2025 AS reporting_year UNION ALL SELECT 2026) y;

WITH RECURSIVE sequence(value) AS (
  SELECT 1
  UNION ALL SELECT value + 1 FROM sequence WHERE value < 14
), months(month_number) AS (
  SELECT 1
  UNION ALL SELECT month_number + 1 FROM months WHERE month_number < 10
), officers AS (
  SELECT region_id, MAX(region_name) AS region_name, ro_id, MAX(ro_name) AS ro_name,
    ROW_NUMBER() OVER (ORDER BY region_id, ro_id) AS officer_order
  FROM financial_investment_events
  GROUP BY region_id, ro_id
), generated AS (
  SELECT reporting_year, o.*, m.month_number, s.value AS sequence_number,
    5 + ((o.officer_order + m.month_number + reporting_year) % 7)
      + CASE WHEN reporting_year = 2026 THEN 1 ELSE 0 END AS monthly_count
  FROM (SELECT 2025 AS reporting_year UNION ALL SELECT 2026) years
  CROSS JOIN officers o
  CROSS JOIN months m
  CROSS JOIN sequence s
)
INSERT INTO mpr_account_openings(
  account_id, customer_id, region_id, region_name, team_id, team_name,
  ro_id, ro_name, account_opening_date, product, account_category,
  reporting_year, source_classification
)
SELECT
  printf('DEMO-ACC-%d-%s-%02d-%02d', reporting_year, ro_id, month_number, sequence_number),
  printf('DEMO-CUST-%d-%s-%02d-%02d', reporting_year, ro_id, month_number, sequence_number),
  region_id, region_name, region_id, region_name, ro_id, ro_name,
  printf('%04d-%02d-%02d', reporting_year, month_number,
    CASE WHEN month_number = 10 THEN 1 + ((sequence_number * 3 + officer_order) % 10)
      ELSE 1 + ((sequence_number * 3 + officer_order) % 27) END),
  CASE (sequence_number + month_number + officer_order) % 7
    WHEN 0 THEN 'SESA without TAX'
    WHEN 1 THEN 'SESA with TAX'
    WHEN 2 THEN 'SHYTA'
    WHEN 3 THEN 'SKET'
    WHEN 4 THEN 'SKIT'
    WHEN 5 THEN 'SIRA'
    ELSE 'SAMTL REIT'
  END,
  CASE (sequence_number + officer_order) % 3
    WHEN 0 THEN 'Individual'
    WHEN 1 THEN 'Corporate'
    ELSE 'Institutional'
  END,
  reporting_year, 'SYNTHETIC_DEMO_ONLY'
FROM generated
WHERE sequence_number <= monthly_count;

DROP VIEW IF EXISTS v_mpr_account_opening_superset;
CREATE VIEW v_mpr_account_opening_superset AS
WITH settings AS (
  SELECT reporting_cutoff FROM financial_reporting_settings WHERE settings_id = 1
), officers AS (
  SELECT DISTINCT region_id, region_name, team_id, team_name, ro_id, ro_name
  FROM mpr_account_openings
), summary AS (
  SELECT o.region_id, o.region_name, o.team_id, o.team_name, o.ro_id, o.ro_name,
    s.reporting_cutoff,
    COUNT(DISTINCT CASE
      WHEN a.account_opening_date BETWEEN substr(s.reporting_cutoff, 1, 4) || '-01-01' AND s.reporting_cutoff
      THEN a.account_id END) AS current_ytd_accounts,
    COUNT(DISTINCT CASE
      WHEN a.account_opening_date BETWEEN date(substr(s.reporting_cutoff, 1, 4) || '-01-01', '-1 year')
        AND date(s.reporting_cutoff, '-1 year')
      THEN a.account_id END) AS previous_ytd_accounts,
    MAX(CASE WHEN t.reporting_year = CAST(substr(s.reporting_cutoff, 1, 4) AS INTEGER)
      THEN t.annual_account_target END) AS account_target
  FROM officers o
  CROSS JOIN settings s
  LEFT JOIN mpr_account_openings a ON a.region_id = o.region_id AND a.ro_id = o.ro_id
  LEFT JOIN mpr_account_opening_targets t ON t.team_id = o.team_id AND t.ro_id = o.ro_id
  GROUP BY o.region_id, o.region_name, o.team_id, o.team_name, o.ro_id, o.ro_name, s.reporting_cutoff
), months(month_number) AS (
  SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
), monthly AS (
  SELECT o.region_id, o.region_name, o.team_id, o.team_name, o.ro_id, o.ro_name,
    s.reporting_cutoff, m.month_number,
    COUNT(DISTINCT CASE WHEN a.reporting_year = CAST(substr(s.reporting_cutoff, 1, 4) AS INTEGER)
      AND CAST(strftime('%m', a.account_opening_date) AS INTEGER) = m.month_number THEN a.account_id END) AS current_accounts,
    COUNT(DISTINCT CASE WHEN a.reporting_year = CAST(substr(s.reporting_cutoff, 1, 4) AS INTEGER) - 1
      AND CAST(strftime('%m', a.account_opening_date) AS INTEGER) = m.month_number THEN a.account_id END) AS previous_accounts
  FROM officers o
  CROSS JOIN settings s
  CROSS JOIN months m
  LEFT JOIN mpr_account_openings a ON a.region_id = o.region_id AND a.ro_id = o.ro_id
  GROUP BY o.region_id, o.region_name, o.team_id, o.team_name, o.ro_id, o.ro_name,
    s.reporting_cutoff, m.month_number
)
SELECT 'ACCOUNT_SUMMARY' AS record_kind, reporting_cutoff AS reporting_date,
  date(substr(reporting_cutoff, 1, 7) || '-01') AS reporting_month,
  region_id, region_name, team_id, team_name, ro_id, ro_name,
  'All Products' AS product,
  account_target, current_ytd_accounts, previous_ytd_accounts,
  current_ytd_accounts - previous_ytd_accounts AS variance,
  CASE WHEN account_target IS NULL OR account_target = 0 THEN NULL
    ELSE current_ytd_accounts * 100.0 / account_target END AS achievement_pct,
  NULL AS current_month_accounts, NULL AS previous_month_accounts,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM summary
UNION ALL
SELECT 'ACCOUNT_MONTHLY',
  printf('%s-%02d-01', substr(reporting_cutoff, 1, 4), month_number),
  printf('%s-%02d-01', substr(reporting_cutoff, 1, 4), month_number),
  region_id, region_name, team_id, team_name, ro_id, ro_name,
  'All Products', NULL, NULL, NULL, NULL, NULL,
  current_accounts, previous_accounts, 'SYNTHETIC_DEMO_ONLY'
FROM monthly;

DROP VIEW IF EXISTS v_mpr_position_superset;
CREATE VIEW v_mpr_position_superset AS
WITH summary AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY ro_name, ro_id) AS serial_no
  FROM v_mpr_team_summary
), months AS (
  SELECT DISTINCT reporting_month FROM v_financial_events_as_of
), ro_products AS (
  SELECT DISTINCT region_id, region_name, ro_id, ro_name, source_product, product, product_code, mapping_status
  FROM v_financial_events_mapped
), monthly_positions AS (
  SELECT m.reporting_month, rp.region_id, rp.region_name, rp.ro_id, rp.ro_name,
    SUM(s.opening_balance_per_ro_product_ngn + COALESCE((
      SELECT SUM(e.signed_movement_ngn)
      FROM v_financial_events_mapped e
      WHERE e.region_id = rp.region_id AND e.ro_id = rp.ro_id
        AND e.source_product = rp.source_product
        AND e.event_date < date(m.reporting_month, '+1 month')
    ), 0)) AS balance_sheet_ngn,
    s.reporting_cutoff
  FROM months m CROSS JOIN ro_products rp
  JOIN financial_reporting_settings s ON s.settings_id = 1
  GROUP BY m.reporting_month, rp.region_id, rp.region_name, rp.ro_id, rp.ro_name, s.reporting_cutoff
)
SELECT 'POSITION_SUMMARY' AS record_kind, reporting_cutoff AS reporting_date,
  date(substr(reporting_cutoff, 1, 7) || '-01') AS reporting_month,
  team_id AS region_id, team_name AS region_name, team_id, team_name, ro_id, ro_name,
  serial_no, 'All Products' AS product,
  new_target_ngn, balance_sheet_ngn, gap_to_meet_ngn,
  required_monthly_run_rate_ngn, achievement_pct,
  target_period_end, remaining_full_months, target_source, position_source,
  data_classification
FROM summary
UNION ALL
SELECT 'POSITION_MONTHLY', reporting_month, reporting_month,
  region_id, region_name, region_id, region_name, ro_id, ro_name,
  NULL, 'All Products', NULL, balance_sheet_ngn, NULL, NULL, NULL,
  NULL, NULL, NULL, 'SYNTHETIC_DEMO_POSITION_VIEW', 'SYNTHETIC_DEMO_ONLY'
FROM monthly_positions
UNION ALL
SELECT 'PRODUCT_POSITION', reporting_cutoff,
  date(substr(reporting_cutoff, 1, 7) || '-01'),
  region_id, region_name, region_id, region_name, ro_id, ro_name,
  NULL, product, NULL, current_position_ngn, NULL, NULL, NULL,
  NULL, NULL, NULL, position_status, data_classification
FROM v_financial_current_position
WHERE mapping_status = 'MAPPED_DEMO';
