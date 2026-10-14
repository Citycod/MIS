DROP VIEW IF EXISTS v_financial_superset;
DROP VIEW IF EXISTS v_financial_target_run_rate;
DROP VIEW IF EXISTS v_financial_current_position;
DROP VIEW IF EXISTS v_financial_rate_summary;
DROP VIEW IF EXISTS v_financial_monthly_profitability;
DROP VIEW IF EXISTS v_financial_monthly_deal_accrual;
DROP VIEW IF EXISTS v_financial_deal_months;
DROP VIEW IF EXISTS v_financial_synthetic_deals;
DROP VIEW IF EXISTS v_financial_deal_metrics;
DROP VIEW IF EXISTS v_financial_monthly_movement;
DROP VIEW IF EXISTS v_financial_events_as_of;
DROP VIEW IF EXISTS v_financial_events_mapped;
DROP VIEW IF EXISTS v_financial_active_events;

CREATE VIEW v_financial_active_events AS
SELECT e.*
FROM financial_investment_events e
JOIN financial_reporting_settings s
  ON s.settings_id = 1 AND s.active_source_sha256 = e.source_sha256;

CREATE VIEW v_financial_events_mapped AS
SELECT
  e.*,
  COALESCE(m.target_product_code, 'UNMAPPED') AS product_code,
  CASE WHEN m.mapping_status = 'MAPPED_DEMO' THEN m.target_product_name ELSE NULL END AS product,
  COALESCE(m.mapping_status, 'UNMAPPED') AS mapping_status,
  COALESCE(m.mapping_note, 'No configured mapping; original source product retained.') AS mapping_note,
  s.reporting_cutoff,
  s.mapping_version
FROM v_financial_active_events e
JOIN financial_reporting_settings s ON s.settings_id = 1
LEFT JOIN financial_product_mapping m
  ON m.mapping_version = s.mapping_version AND m.source_product = e.source_product;

CREATE VIEW v_financial_events_as_of AS
SELECT *
FROM v_financial_events_mapped
WHERE event_date <= reporting_cutoff;

CREATE VIEW v_financial_monthly_movement AS
SELECT
  reporting_month,
  region_id,
  MAX(region_name) AS region_name,
  ro_id,
  MAX(ro_name) AS ro_name,
  product_code,
  product,
  mapping_status,
  source_product,
  SUM(new_external_inflow_ngn) AS inflow_ngn,
  SUM(withdrawal_ngn) AS withdrawal_ngn,
  SUM(maturity_outflow_ngn) AS maturity_outflow_ngn,
  SUM(withdrawal_ngn + maturity_outflow_ngn) AS total_outflow_ngn,
  SUM(rollover_volume_ngn) AS rollover_ngn,
  SUM(signed_movement_ngn) AS net_movement_ngn,
  COUNT(*) AS event_count,
  MAX(reporting_cutoff) AS reporting_cutoff,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM v_financial_events_as_of
GROUP BY reporting_month, region_id, ro_id, product_code, product, mapping_status, source_product;

CREATE VIEW v_financial_deal_metrics AS
SELECT
  e.*,
  date(e.event_date, '+' || e.tenor_days || ' days') AS calculated_maturity_date,
  e.transaction_amount_ngn * e.customer_rate_pct / 100.0 * e.tenor_days / s.day_count_basis AS calculated_tenor_interest_ngn,
  e.transaction_amount_ngn +
    e.transaction_amount_ngn * e.customer_rate_pct / 100.0 * e.tenor_days / s.day_count_basis AS calculated_maturity_balance_ngn,
  CASE
    WHEN SUM(e.transaction_amount_ngn) OVER (
      PARTITION BY e.region_id, e.ro_id, e.reporting_month
    ) = 0 THEN NULL
    ELSE e.transaction_amount_ngn / SUM(e.transaction_amount_ngn) OVER (
      PARTITION BY e.region_id, e.ro_id, e.reporting_month
    )
  END AS customer_portfolio_weight,
  CASE
    WHEN SUM(e.transaction_amount_ngn) OVER (
      PARTITION BY e.region_id, e.ro_id, e.reporting_month
    ) = 0 THEN NULL
    ELSE e.customer_rate_pct * e.transaction_amount_ngn /
      SUM(e.transaction_amount_ngn) OVER (PARTITION BY e.region_id, e.ro_id, e.reporting_month)
  END AS weighted_rate_contribution_pct,
  s.day_count_basis,
  s.effective_date_included,
  'SOURCE_EVENT_FORMULA' AS calculation_scenario
FROM v_financial_events_as_of e
JOIN financial_reporting_settings s ON s.settings_id = 1;

CREATE VIEW v_financial_synthetic_deals AS
SELECT
  e.*,
  e.event_date AS effective_date,
  date(e.event_date, '+' || e.tenor_days || ' days') AS calculated_maturity_date,
  'NEW_INFLOW_ONLY_NO_LIFECYCLE_LINKAGE' AS scenario_status
FROM v_financial_events_as_of e
WHERE e.event_type = 'NEW_INFLOW';

CREATE VIEW v_financial_deal_months AS
WITH RECURSIVE months(month_start) AS (
  SELECT date(substr(MIN(e.event_date), 1, 7) || '-01')
  FROM v_financial_synthetic_deals e
  UNION ALL
  SELECT date(month_start, '+1 month')
  FROM months, financial_reporting_settings s
  WHERE month_start < date(substr(s.reporting_cutoff, 1, 7) || '-01')
)
SELECT
  d.source_sha256,
  d.event_id,
  d.region_id,
  d.region_name,
  d.ro_id,
  d.ro_name,
  d.customer_id,
  d.customer_name,
  d.source_product,
  d.product_code,
  d.product,
  d.mapping_status,
  d.transaction_amount_ngn,
  d.calculation_base_ngn,
  d.customer_rate_pct,
  d.pool_rate_pct,
  d.tenor_days,
  d.effective_date,
  d.calculated_maturity_date,
  d.scenario_status,
  m.month_start AS reporting_month,
  CASE
    WHEN d.effective_date > m.month_start THEN d.effective_date
    ELSE m.month_start
  END AS accrual_start_date,
  CASE
    WHEN d.calculated_maturity_date < date(m.month_start, '+1 month')
         AND d.calculated_maturity_date < s.reporting_cutoff THEN d.calculated_maturity_date
    WHEN s.reporting_cutoff < date(m.month_start, '+1 month') THEN s.reporting_cutoff
    ELSE date(m.month_start, '+1 month')
  END AS accrual_end_date,
  s.day_count_basis,
  s.effective_date_included,
  s.wht_rate_pct,
  s.illustrative_opex_rate_pct,
  s.reporting_cutoff
FROM v_financial_synthetic_deals d
CROSS JOIN months m
JOIN financial_reporting_settings s ON s.settings_id = 1
WHERE m.month_start <= d.calculated_maturity_date
  AND date(m.month_start, '+1 month') > d.effective_date
  AND m.month_start <= date(substr(s.reporting_cutoff, 1, 7) || '-01');

CREATE VIEW v_financial_monthly_deal_accrual AS
WITH applicable AS (
  SELECT
    dm.*,
    CASE
      WHEN julianday(accrual_end_date) <= julianday(accrual_start_date) THEN 0
      ELSE CAST(julianday(accrual_end_date) - julianday(accrual_start_date) AS INTEGER)
        + effective_date_included
    END AS applicable_days
  FROM v_financial_deal_months dm
)
SELECT
  a.*,
  a.calculation_base_ngn * a.customer_rate_pct / 100.0 * a.applicable_days / a.day_count_basis AS interest_expense_ngn,
  a.calculation_base_ngn * a.pool_rate_pct / 100.0 * a.applicable_days / a.day_count_basis AS interest_income_ngn,
  a.calculation_base_ngn * (a.pool_rate_pct - a.customer_rate_pct) / 100.0 * a.applicable_days / a.day_count_basis AS deal_margin_ngn,
  a.calculation_base_ngn * a.pool_rate_pct / 100.0 * a.applicable_days / a.day_count_basis
    * a.wht_rate_pct / 100.0 AS illustrative_wht_ngn,
  a.calculation_base_ngn * (
      a.pool_rate_pct - a.pool_rate_pct * a.wht_rate_pct / 100.0 - a.customer_rate_pct
    ) / 100.0 * a.applicable_days / a.day_count_basis AS illustrative_management_margin_ngn,
  a.calculation_base_ngn * a.pool_rate_pct / 100.0 * a.applicable_days / a.day_count_basis
    * a.illustrative_opex_rate_pct / 100.0 AS illustrative_opex_ngn,
  a.calculation_base_ngn * (
      a.pool_rate_pct - a.pool_rate_pct * a.wht_rate_pct / 100.0
      - a.customer_rate_pct - a.pool_rate_pct * a.illustrative_opex_rate_pct / 100.0
    ) / 100.0 * a.applicable_days / a.day_count_basis AS illustrative_final_profitability_ngn,
  'ILLUSTRATIVE_UNAPPROVED_POLICY' AS profitability_status,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM applicable a;

CREATE VIEW v_financial_monthly_profitability AS
SELECT
  reporting_month,
  region_id,
  MAX(region_name) AS region_name,
  ro_id,
  MAX(ro_name) AS ro_name,
  product_code,
  product,
  mapping_status,
  SUM(interest_expense_ngn) AS interest_expense_ngn,
  SUM(interest_income_ngn) AS interest_income_ngn,
  SUM(deal_margin_ngn) AS deal_margin_ngn,
  SUM(illustrative_wht_ngn) AS illustrative_wht_ngn,
  SUM(illustrative_management_margin_ngn) AS illustrative_management_margin_ngn,
  SUM(illustrative_opex_ngn) AS illustrative_opex_ngn,
  SUM(illustrative_final_profitability_ngn) AS illustrative_final_profitability_ngn,
  SUM(applicable_days) AS applicable_days,
  MAX(reporting_cutoff) AS reporting_cutoff,
  'ILLUSTRATIVE_UNAPPROVED_POLICY' AS profitability_status,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM v_financial_monthly_deal_accrual
GROUP BY reporting_month, region_id, ro_id, product_code, product, mapping_status;

CREATE VIEW v_financial_rate_summary AS
SELECT
  e.region_id,
  MAX(e.region_name) AS region_name,
  e.ro_id,
  MAX(e.ro_name) AS ro_name,
  e.product_code,
  e.product,
  e.mapping_status,
  SUM(e.transaction_amount_ngn) AS weighting_amount_ngn,
  SUM(e.transaction_amount_ngn * e.customer_rate_pct) / NULLIF(SUM(e.transaction_amount_ngn), 0) AS wacc_pct,
  SUM(e.transaction_amount_ngn * e.pool_rate_pct) / NULLIF(SUM(e.transaction_amount_ngn), 0) AS weighted_pool_rate_pct,
  SUM(e.transaction_amount_ngn * (e.pool_rate_pct - e.customer_rate_pct)) /
    NULLIF(SUM(e.transaction_amount_ngn), 0) AS pool_spread_pct_points,
  MAX(e.reporting_cutoff) AS reporting_cutoff,
  'NEW_INFLOW_ONLY_NO_LIFECYCLE_LINKAGE' AS rate_scenario,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM v_financial_synthetic_deals e
GROUP BY e.region_id, e.ro_id, e.product_code, e.product, e.mapping_status;

CREATE VIEW v_financial_current_position AS
WITH ro_products AS (
  SELECT DISTINCT region_id, region_name, ro_id, ro_name, source_product, product_code, product, mapping_status
  FROM v_financial_events_mapped
), movements AS (
  SELECT region_id, ro_id, source_product, SUM(signed_movement_ngn) AS movement_ngn
  FROM v_financial_events_as_of
  GROUP BY region_id, ro_id, source_product
)
SELECT
  rp.region_id,
  rp.region_name,
  rp.ro_id,
  rp.ro_name,
  rp.source_product,
  rp.product_code,
  rp.product,
  rp.mapping_status,
  s.opening_balance_per_ro_product_ngn AS assumed_opening_position_ngn,
  COALESCE(m.movement_ngn, 0) AS ytd_net_movement_ngn,
  s.opening_balance_per_ro_product_ngn + COALESCE(m.movement_ngn, 0) AS current_position_ngn,
  s.reporting_cutoff,
  'ASSUMED_OPENING_PLUS_SOURCE_MOVEMENT' AS position_status,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM ro_products rp
LEFT JOIN movements m
  ON m.region_id = rp.region_id AND m.ro_id = rp.ro_id AND m.source_product = rp.source_product
JOIN financial_reporting_settings s ON s.settings_id = 1;

CREATE VIEW v_financial_target_run_rate AS
WITH ro_position AS (
  SELECT
    region_id,
    MAX(region_name) AS region_name,
    ro_id,
    MAX(ro_name) AS ro_name,
    SUM(current_position_ngn) AS current_position_ngn,
    MAX(reporting_cutoff) AS reporting_cutoff
  FROM v_financial_current_position
  GROUP BY region_id, ro_id
)
SELECT
  p.*,
  s.annual_target_per_ro_ngn AS annual_target_ngn,
  CASE WHEN s.annual_target_per_ro_ngn = 0 THEN NULL
    ELSE p.current_position_ngn / s.annual_target_per_ro_ngn * 100.0 END AS position_achievement_pct,
  MAX(s.annual_target_per_ro_ngn - p.current_position_ngn, 0) AS position_gap_ngn,
  CASE WHEN (12 - CAST(strftime('%m', p.reporting_cutoff) AS INTEGER)) <= 0 THEN NULL
    ELSE MAX(s.annual_target_per_ro_ngn - p.current_position_ngn, 0) /
      (12 - CAST(strftime('%m', p.reporting_cutoff) AS INTEGER)) END AS required_monthly_run_rate_ngn,
  CASE WHEN julianday(date(substr(p.reporting_cutoff, 1, 4) || '-12-31')) - julianday(p.reporting_cutoff) <= 0 THEN NULL
    ELSE MAX(s.annual_target_per_ro_ngn - p.current_position_ngn, 0) /
      (julianday(date(substr(p.reporting_cutoff, 1, 4) || '-12-31')) - julianday(p.reporting_cutoff)) END AS required_daily_run_rate_ngn,
  s.daily_run_rate_basis,
  'ASSUMED_TARGET_AND_OPENING_POSITION' AS target_status,
  'SYNTHETIC_DEMO_ONLY' AS data_classification
FROM ro_position p
JOIN financial_reporting_settings s ON s.settings_id = 1;

CREATE VIEW v_financial_superset AS
SELECT
  'EVENT' AS record_kind,
  e.event_date AS reporting_date,
  e.reporting_month,
  e.region_id, e.region_name, e.ro_id, e.ro_name,
  e.customer_id, e.customer_name,
  e.product_code, e.product, e.source_product, e.mapping_status,
  e.event_type,
  e.transaction_amount_ngn AS amount_ngn,
  NULL AS secondary_amount_ngn,
  e.new_external_inflow_ngn AS inflow_ngn,
  e.withdrawal_ngn + e.maturity_outflow_ngn AS outflow_ngn,
  e.rollover_volume_ngn AS rollover_ngn,
  e.signed_movement_ngn AS net_movement_ngn,
  NULL AS annual_target_ngn, NULL AS current_position_ngn,
  NULL AS target_achievement_pct, NULL AS position_gap_ngn,
  NULL AS required_monthly_run_rate_ngn, NULL AS required_daily_run_rate_ngn,
  e.customer_rate_pct, e.pool_rate_pct,
  NULL AS wacc_pct, NULL AS pool_spread_pct_points,
  NULL AS interest_expense_ngn, NULL AS interest_income_ngn,
  NULL AS deal_margin_ngn, NULL AS illustrative_wht_ngn,
  NULL AS illustrative_management_margin_ngn, NULL AS illustrative_opex_ngn,
  NULL AS illustrative_final_profitability_ngn,
  NULL AS applicable_days,
  e.tenor_days,
  date(e.event_date, '+' || e.tenor_days || ' days') AS maturity_date,
  e.reporting_cutoff,
  'SOURCE_EVENT' AS calculation_status,
  e.data_classification
FROM v_financial_events_as_of e
UNION ALL
SELECT
  'MONTHLY_MOVEMENT', m.reporting_month, m.reporting_month,
  m.region_id, m.region_name, m.ro_id, m.ro_name,
  NULL, NULL, m.product_code, m.product, m.source_product, m.mapping_status,
  NULL, m.inflow_ngn, m.total_outflow_ngn,
  m.inflow_ngn, m.total_outflow_ngn, m.rollover_ngn, m.net_movement_ngn,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, m.reporting_cutoff,
  'SOURCE_EVENT_AGGREGATION', m.data_classification
FROM v_financial_monthly_movement m
UNION ALL
SELECT
  'MONTHLY_PROFITABILITY', p.reporting_month, p.reporting_month,
  p.region_id, p.region_name, p.ro_id, p.ro_name,
  NULL, NULL, p.product_code, p.product, NULL, p.mapping_status,
  NULL, p.interest_income_ngn, p.interest_expense_ngn,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  p.interest_expense_ngn, p.interest_income_ngn, p.deal_margin_ngn,
  p.illustrative_wht_ngn, p.illustrative_management_margin_ngn,
  p.illustrative_opex_ngn, p.illustrative_final_profitability_ngn,
  p.applicable_days, NULL, NULL, p.reporting_cutoff,
  p.profitability_status, p.data_classification
FROM v_financial_monthly_profitability p
UNION ALL
SELECT
  'RATE_SUMMARY', r.reporting_cutoff, date(substr(r.reporting_cutoff, 1, 7) || '-01'),
  r.region_id, r.region_name, r.ro_id, r.ro_name,
  NULL, NULL, r.product_code, r.product, NULL, r.mapping_status,
  NULL, r.weighting_amount_ngn, NULL,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, r.weighted_pool_rate_pct, r.wacc_pct, r.pool_spread_pct_points,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, r.reporting_cutoff,
  r.rate_scenario, r.data_classification
FROM v_financial_rate_summary r
UNION ALL
SELECT
  'CURRENT_POSITION', p.reporting_cutoff, date(substr(p.reporting_cutoff, 1, 7) || '-01'),
  p.region_id, p.region_name, p.ro_id, p.ro_name,
  NULL, NULL, p.product_code, p.product, p.source_product, p.mapping_status,
  NULL, p.current_position_ngn, NULL,
  NULL, NULL, NULL, p.ytd_net_movement_ngn,
  NULL, p.current_position_ngn, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, p.reporting_cutoff,
  p.position_status, p.data_classification
FROM v_financial_current_position p
UNION ALL
SELECT
  'TARGET_RUN_RATE', t.reporting_cutoff, date(substr(t.reporting_cutoff, 1, 7) || '-01'),
  t.region_id, t.region_name, t.ro_id, t.ro_name,
  NULL, NULL, 'PROD-ALL', 'All Products', NULL, 'MAPPED_DEMO',
  NULL, t.current_position_ngn, t.annual_target_ngn,
  NULL, NULL, NULL, NULL,
  t.annual_target_ngn, t.current_position_ngn, t.position_achievement_pct,
  t.position_gap_ngn, t.required_monthly_run_rate_ngn, t.required_daily_run_rate_ngn,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, t.reporting_cutoff,
  t.target_status, t.data_classification
FROM v_financial_target_run_rate t;
