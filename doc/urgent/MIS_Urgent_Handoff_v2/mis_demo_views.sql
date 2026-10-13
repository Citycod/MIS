-- MIS v2 DEMONSTRATION ONLY. These SQL views are unapproved examples, not bank/Finance rules.
-- Execute against isolated SQLite synthetic fixtures only. Do not run on live CRM or Superset metadata.
CREATE VIEW v_demo_events AS
SELECT event_id, event_date, date(event_date,'start of month') AS reporting_month,
       region_id,region,ro_id,ro_name,customer_id,customer_name,product,event_type,
       CAST(transaction_amount_ngn AS NUMERIC) AS transaction_amount_ngn,
       CAST(customer_rate_pct AS NUMERIC) AS customer_rate_pct,
       tenor_days, date(event_date,'+' || tenor_days || ' days') AS illustrative_maturity_date,
       source_sample_row, currency, data_classification,
       CASE WHEN event_type='NEW_INFLOW' THEN CAST(transaction_amount_ngn AS NUMERIC) ELSE 0 END AS external_inflow_ngn,
       CASE WHEN event_type='WITHDRAWAL' THEN CAST(transaction_amount_ngn AS NUMERIC) ELSE 0 END AS withdrawal_ngn,
       CASE WHEN event_type='ROLLOVER' THEN CAST(transaction_amount_ngn AS NUMERIC) ELSE 0 END AS rollover_ngn,
       CASE WHEN event_type='MATURITY' THEN CAST(transaction_amount_ngn AS NUMERIC) ELSE 0 END AS maturity_event_ngn,
       CASE WHEN event_type='NEW_INFLOW' THEN CAST(transaction_amount_ngn AS NUMERIC)
            WHEN event_type='WITHDRAWAL' THEN -CAST(transaction_amount_ngn AS NUMERIC)
            ELSE 0 END AS signed_external_movement_ngn
FROM demo_investment_events;

CREATE VIEW v_demo_monthly_ro_product_movement AS
WITH RECURSIVE months(reporting_month) AS (
  SELECT '2026-01-01'
  UNION ALL SELECT date(reporting_month,'+1 month') FROM months WHERE reporting_month<'2026-10-01'
),
flow AS (
  SELECT reporting_month, ro_id,product,
         SUM(external_inflow_ngn) external_inflows_ngn,
         SUM(withdrawal_ngn) withdrawals_ngn,
         SUM(rollover_ngn) rollovers_ngn,
         SUM(maturity_event_ngn) maturities_ngn,
         SUM(signed_external_movement_ngn) net_external_movement_ngn
  FROM v_demo_events GROUP BY reporting_month, ro_id,product
),
periods AS (
  SELECT m.reporting_month,p.region_id,p.region,p.ro_id,p.ro_name,p.product,
         CAST(p.opening_position_ngn AS NUMERIC) initial_position_ngn,
         COALESCE(f.external_inflows_ngn,0) external_inflows_ngn,
         COALESCE(f.withdrawals_ngn,0) withdrawals_ngn,
         COALESCE(f.rollovers_ngn,0) rollovers_ngn,
         COALESCE(f.maturities_ngn,0) maturities_ngn,
         COALESCE(f.net_external_movement_ngn,0) net_external_movement_ngn
  FROM demo_starting_positions p CROSS JOIN months m
  LEFT JOIN flow f ON f.reporting_month=m.reporting_month AND f.ro_id=p.ro_id AND f.product=p.product
),
roll AS (
  SELECT periods.*,
         SUM(net_external_movement_ngn) OVER (PARTITION BY ro_id,product ORDER BY reporting_month ROWS UNBOUNDED PRECEDING) cumulative_external_movement_ngn
  FROM periods
)
SELECT reporting_month,region_id,region,ro_id,ro_name,product,
       ROUND(initial_position_ngn+cumulative_external_movement_ngn-net_external_movement_ngn,2) opening_position_ngn,
       ROUND(external_inflows_ngn,2) external_inflows_ngn,
       ROUND(withdrawals_ngn,2) withdrawals_ngn,
       ROUND(rollovers_ngn,2) rollovers_ngn,
       ROUND(maturities_ngn,2) maturities_ngn,
       ROUND(net_external_movement_ngn,2) net_external_movement_ngn,
       ROUND(initial_position_ngn+cumulative_external_movement_ngn,2) closing_position_ngn,
       'NGN' currency,'SYNTHETIC_DEMO_ONLY' data_classification
FROM roll;

CREATE VIEW v_demo_monthly_ro_position AS
WITH sums AS (
SELECT reporting_month,region_id,region,ro_id,ro_name,
       SUM(opening_position_ngn) opening_position_ngn,
       SUM(external_inflows_ngn) external_inflows_ngn,
       SUM(withdrawals_ngn) withdrawals_ngn,
       SUM(rollovers_ngn) rollovers_ngn,
       SUM(maturities_ngn) maturities_ngn,
       SUM(net_external_movement_ngn) net_external_movement_ngn,
       SUM(closing_position_ngn) closing_position_ngn
FROM v_demo_monthly_ro_product_movement
GROUP BY reporting_month,region_id,region,ro_id,ro_name)
SELECT sums.*,t.annual_portfolio_target_ngn,
 CASE WHEN t.annual_portfolio_target_ngn>0 THEN ROUND(100*sums.closing_position_ngn/t.annual_portfolio_target_ngn,2) ELSE NULL END achievement_pct,
 ROUND(t.annual_portfolio_target_ngn-sums.closing_position_ngn,2) remaining_gap_ngn,
 NULL AS approved_monthly_run_rate_ngn,
 NULL AS approved_profitability_ngn,
 NULL AS approved_wacc_pct,
 'NGN' currency,'SYNTHETIC_DEMO_ONLY' data_classification
FROM sums LEFT JOIN demo_ro_targets t ON t.ro_id=sums.ro_id AND t.financial_year=CAST(substr(sums.reporting_month,1,4) AS INTEGER);

-- External NEW_INFLOW only is a demonstrative, not approved, interpretation of investment mix.
CREATE VIEW v_demo_investment_mix AS
SELECT reporting_month, region_id, region, ro_id, ro_name, product,
       ROUND(SUM(external_inflow_ngn),2) eligible_inflow_ngn,
       'DEMO_EXTERNAL_NEW_INFLOW_UNAPPROVED' mix_definition,
       'SYNTHETIC_DEMO_ONLY' data_classification
FROM v_demo_events
GROUP BY reporting_month,region_id,region,ro_id,ro_name,product;
