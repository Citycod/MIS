DROP VIEW IF EXISTS v_mpr_account_opening_dashboard;
CREATE VIEW v_mpr_account_opening_dashboard AS
SELECT a.*, s.reporting_cutoff
FROM v_mpr_account_opening_superset a
JOIN financial_reporting_settings s ON s.settings_id = 1;

DROP VIEW IF EXISTS v_mpr_position_dashboard_v2;
CREATE VIEW v_mpr_position_dashboard_v2 AS
SELECT p.*, s.reporting_cutoff
FROM v_mpr_position_dashboard p
JOIN financial_reporting_settings s ON s.settings_id = 1;
