DROP VIEW IF EXISTS v_mpr_position_dashboard;
CREATE VIEW v_mpr_position_dashboard AS
SELECT p.*,
  CASE WHEN new_target_ngn IS NULL THEN NULL ELSE printf('₦%,.0f', new_target_ngn) END AS new_target_display,
  CASE WHEN balance_sheet_ngn IS NULL THEN NULL ELSE printf('₦%,.0f', balance_sheet_ngn) END AS balance_sheet_display,
  CASE WHEN gap_to_meet_ngn IS NULL THEN NULL ELSE printf('₦%,.0f', gap_to_meet_ngn) END AS gap_to_meet_display,
  CASE WHEN required_monthly_run_rate_ngn IS NULL THEN 'Unavailable'
    ELSE printf('₦%,.0f', required_monthly_run_rate_ngn) END AS run_rate_display
FROM v_mpr_position_superset p;
