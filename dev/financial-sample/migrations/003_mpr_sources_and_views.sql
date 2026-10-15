CREATE TABLE mpr_source_imports (
  import_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL CHECK (source_system IN ('ODOO_TARGETS', 'SYMPLUS_POSITIONS')),
  source_file TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  source_version TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
  data_classification TEXT NOT NULL CHECK (data_classification = 'CONTROLLED_SOURCE_IMPORT'),
  UNIQUE (source_system, source_sha256)
);

CREATE TABLE mpr_odoo_targets (
  import_id TEXT NOT NULL,
  source_target_id TEXT NOT NULL,
  reporting_year INTEGER NOT NULL CHECK (reporting_year BETWEEN 2000 AND 2200),
  target_period_start TEXT NOT NULL,
  target_period_end TEXT NOT NULL,
  team_id TEXT NOT NULL,
  ro_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('NEW_TARGET_ANNUAL', 'NEW_TARGET_PERIOD')),
  target_amount_ngn REAL NOT NULL CHECK (target_amount_ngn >= 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  effective_date TEXT NOT NULL,
  source_version TEXT NOT NULL,
  PRIMARY KEY (import_id, source_target_id),
  FOREIGN KEY (import_id) REFERENCES mpr_source_imports(import_id)
);

CREATE TABLE mpr_symplus_positions (
  import_id TEXT NOT NULL,
  source_position_id TEXT NOT NULL,
  position_as_of_date TEXT NOT NULL,
  team_id TEXT NOT NULL,
  ro_id TEXT NOT NULL,
  investment_account_id TEXT NOT NULL,
  product TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  balance_sheet_position_ngn REAL NOT NULL,
  source_version TEXT NOT NULL,
  PRIMARY KEY (import_id, source_position_id),
  FOREIGN KEY (import_id) REFERENCES mpr_source_imports(import_id)
);

CREATE INDEX idx_mpr_targets_scope_period
  ON mpr_odoo_targets(team_id, ro_id, reporting_year, target_period_start, target_period_end);
CREATE INDEX idx_mpr_positions_scope_date
  ON mpr_symplus_positions(team_id, ro_id, position_as_of_date);

DROP VIEW IF EXISTS v_mpr_team_summary;
CREATE VIEW v_mpr_team_summary AS
WITH settings AS (
  SELECT reporting_cutoff FROM financial_reporting_settings WHERE settings_id = 1
), demo AS (
  SELECT region_id AS team_id, region_name AS team_name, ro_id, ro_name,
    annual_target_ngn AS demo_target_ngn,
    current_position_ngn AS demo_position_ngn,
    reporting_cutoff
  FROM v_financial_target_run_rate
), eligible_targets AS (
  SELECT t.*, i.imported_at,
    ROW_NUMBER() OVER (
      PARTITION BY t.team_id, t.ro_id
      ORDER BY t.effective_date DESC, i.imported_at DESC, t.source_target_id DESC
    ) AS row_rank
  FROM mpr_odoo_targets t
  JOIN mpr_source_imports i ON i.import_id = t.import_id AND i.status = 'COMPLETED'
  JOIN settings s
  WHERE t.reporting_year = CAST(strftime('%Y', s.reporting_cutoff) AS INTEGER)
    AND t.effective_date <= s.reporting_cutoff
    AND t.target_period_start <= s.reporting_cutoff
    AND t.target_period_end >= s.reporting_cutoff
), selected_targets AS (
  SELECT * FROM eligible_targets WHERE row_rank = 1
), odoo_teams AS (
  SELECT DISTINCT team_id FROM eligible_targets
), eligible_position_rows AS (
  SELECT p.*, i.imported_at
  FROM mpr_symplus_positions p
  JOIN mpr_source_imports i ON i.import_id = p.import_id AND i.status = 'COMPLETED'
  JOIN settings s
  WHERE p.position_as_of_date <= s.reporting_cutoff
), selected_position_dates AS (
  SELECT team_id, ro_id, MAX(position_as_of_date) AS position_as_of_date
  FROM eligible_position_rows
  GROUP BY team_id, ro_id
), selected_positions AS (
  SELECT p.team_id, p.ro_id, p.position_as_of_date,
    SUM(p.balance_sheet_position_ngn) AS position_ngn,
    MAX(p.imported_at) AS imported_at
  FROM eligible_position_rows p
  JOIN selected_position_dates d
    ON d.team_id = p.team_id AND d.ro_id = p.ro_id
   AND d.position_as_of_date = p.position_as_of_date
  GROUP BY p.team_id, p.ro_id, p.position_as_of_date
), symplus_teams AS (
  SELECT DISTINCT team_id FROM eligible_position_rows
), universe AS (
  SELECT team_id, ro_id FROM demo
  UNION SELECT team_id, ro_id FROM selected_targets
  UNION SELECT team_id, ro_id FROM selected_positions
), source_values AS (
  SELECT
    u.team_id,
    COALESCE(d.team_name, u.team_id) AS team_name,
    u.ro_id,
    COALESCE(d.ro_name, u.ro_id) AS ro_name,
    s.reporting_cutoff,
    CASE WHEN ot.team_id IS NOT NULL THEN t.target_amount_ngn ELSE d.demo_target_ngn END AS new_target_ngn,
    CASE WHEN st.team_id IS NOT NULL THEN p.position_ngn ELSE d.demo_position_ngn END AS balance_sheet_ngn,
    CASE WHEN ot.team_id IS NOT NULL THEN t.target_period_end
      ELSE date(substr(s.reporting_cutoff, 1, 4) || '-12-31') END AS target_period_end,
    CASE WHEN ot.team_id IS NOT NULL THEN 'ODOO_MANUAL_IMPORT'
      ELSE 'SYNTHETIC_DEMO_TARGET_CONFIGURATION' END AS target_source,
    CASE WHEN st.team_id IS NOT NULL THEN 'SYMPLUS_MANUAL_IMPORT'
      ELSE 'SYNTHETIC_DEMO_POSITION_VIEW' END AS position_source,
    CASE WHEN ot.team_id IS NOT NULL THEN t.target_type
      ELSE 'ANNUAL_TARGET_DEMO_MAPPING_PENDING' END AS target_definition,
    CASE WHEN st.team_id IS NOT NULL THEN p.position_as_of_date ELSE s.reporting_cutoff END AS position_as_of_date
  FROM universe u
  CROSS JOIN settings s
  LEFT JOIN demo d ON d.team_id = u.team_id AND d.ro_id = u.ro_id
  LEFT JOIN odoo_teams ot ON ot.team_id = u.team_id
  LEFT JOIN selected_targets t ON t.team_id = u.team_id AND t.ro_id = u.ro_id
  LEFT JOIN symplus_teams st ON st.team_id = u.team_id
  LEFT JOIN selected_positions p ON p.team_id = u.team_id AND p.ro_id = u.ro_id
), calculated AS (
  SELECT *,
    CASE WHEN new_target_ngn IS NULL OR balance_sheet_ngn IS NULL THEN NULL
      ELSE new_target_ngn - balance_sheet_ngn END AS gap_to_meet_ngn,
    CASE WHEN new_target_ngn IS NULL OR new_target_ngn = 0 OR balance_sheet_ngn IS NULL THEN NULL
      ELSE balance_sheet_ngn / new_target_ngn * 100.0 END AS achievement_pct,
    CASE WHEN target_period_end IS NULL THEN NULL ELSE MAX(
      (CAST(strftime('%Y', target_period_end) AS INTEGER) - CAST(strftime('%Y', reporting_cutoff) AS INTEGER)) * 12
      + CAST(strftime('%m', target_period_end) AS INTEGER)
      - CAST(strftime('%m', reporting_cutoff) AS INTEGER), 0
    ) END AS remaining_full_months
  FROM source_values
)
SELECT *,
  CASE WHEN gap_to_meet_ngn IS NULL OR remaining_full_months IS NULL OR remaining_full_months = 0 THEN NULL
    ELSE gap_to_meet_ngn / remaining_full_months END AS required_monthly_run_rate_ngn,
  'FULL_MONTHS_AFTER_REPORTING_MONTH' AS run_rate_convention,
  CASE
    WHEN target_source LIKE 'SYNTHETIC%' AND position_source LIKE 'SYNTHETIC%' THEN 'SYNTHETIC_DEMO_ONLY'
    WHEN target_source LIKE 'SYNTHETIC%' OR position_source LIKE 'SYNTHETIC%' THEN 'MIXED_IMPORTED_AND_SYNTHETIC_DEMO'
    ELSE 'CONTROLLED_SOURCE_IMPORT'
  END AS data_classification
FROM calculated;
