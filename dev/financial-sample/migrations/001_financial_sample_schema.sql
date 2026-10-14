CREATE TABLE financial_import_runs (
  import_id TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  source_sha256 TEXT NOT NULL UNIQUE,
  mapping_version TEXT NOT NULL,
  reporting_cutoff TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  source_row_count INTEGER NOT NULL DEFAULT 0,
  inserted_row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  error_message TEXT
);

CREATE TABLE financial_reporting_settings (
  settings_id INTEGER PRIMARY KEY CHECK (settings_id = 1),
  active_source_sha256 TEXT,
  mapping_version TEXT NOT NULL,
  reporting_cutoff TEXT NOT NULL,
  day_count_basis INTEGER NOT NULL CHECK (day_count_basis > 0),
  effective_date_included INTEGER NOT NULL CHECK (effective_date_included IN (0, 1)),
  wht_rate_pct REAL NOT NULL CHECK (wht_rate_pct >= 0),
  illustrative_opex_rate_pct REAL NOT NULL CHECK (illustrative_opex_rate_pct >= 0),
  opening_balance_per_ro_product_ngn REAL NOT NULL CHECK (opening_balance_per_ro_product_ngn >= 0),
  annual_target_per_ro_ngn REAL NOT NULL CHECK (annual_target_per_ro_ngn >= 0),
  rollover_treatment TEXT NOT NULL,
  daily_run_rate_basis TEXT NOT NULL,
  data_classification TEXT NOT NULL CHECK (data_classification = 'SYNTHETIC_DEMO_ONLY'),
  updated_at TEXT NOT NULL
);

CREATE TABLE financial_product_catalog (
  product_code TEXT PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE,
  is_active INTEGER NOT NULL CHECK (is_active IN (0, 1))
);

CREATE TABLE financial_product_mapping (
  mapping_version TEXT NOT NULL,
  source_product TEXT NOT NULL,
  target_product_code TEXT,
  target_product_name TEXT,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MAPPED_DEMO', 'UNMAPPED')),
  mapping_note TEXT NOT NULL,
  PRIMARY KEY (mapping_version, source_product),
  FOREIGN KEY (target_product_code) REFERENCES financial_product_catalog(product_code)
);

CREATE TABLE financial_investment_events (
  source_sha256 TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  reporting_month TEXT NOT NULL,
  region_id TEXT NOT NULL,
  region_name TEXT NOT NULL,
  ro_id TEXT NOT NULL,
  ro_name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  source_product TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('NEW_INFLOW', 'ROLLOVER', 'WITHDRAWAL', 'MATURITY')),
  transaction_amount_ngn REAL NOT NULL CHECK (transaction_amount_ngn >= 0),
  calculation_base_ngn REAL NOT NULL CHECK (calculation_base_ngn >= 0),
  customer_rate_pct REAL NOT NULL,
  pool_rate_pct REAL NOT NULL,
  tenor_days INTEGER NOT NULL CHECK (tenor_days >= 0),
  source_maturity_date TEXT NOT NULL,
  source_sample_row INTEGER,
  currency TEXT NOT NULL,
  data_classification TEXT NOT NULL CHECK (data_classification = 'SYNTHETIC_DEMO_ONLY'),
  record_origin TEXT NOT NULL,
  signed_movement_ngn REAL NOT NULL,
  new_external_inflow_ngn REAL NOT NULL CHECK (new_external_inflow_ngn >= 0),
  withdrawal_ngn REAL NOT NULL CHECK (withdrawal_ngn >= 0),
  maturity_outflow_ngn REAL NOT NULL CHECK (maturity_outflow_ngn >= 0),
  rollover_volume_ngn REAL NOT NULL CHECK (rollover_volume_ngn >= 0),
  source_annual_customer_interest_ngn REAL NOT NULL,
  source_annual_pool_interest_ngn REAL NOT NULL,
  source_annual_interest_spread_ngn REAL NOT NULL,
  source_tenor_customer_interest_ngn REAL NOT NULL,
  source_tenor_pool_interest_ngn REAL NOT NULL,
  source_tenor_interest_margin_ngn REAL NOT NULL,
  source_estimated_maturity_value_ngn REAL NOT NULL,
  source_spread_pct_points REAL NOT NULL,
  source_file TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  raw_source_json TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  import_id TEXT NOT NULL,
  PRIMARY KEY (source_sha256, event_id),
  FOREIGN KEY (import_id) REFERENCES financial_import_runs(import_id)
);

CREATE INDEX idx_financial_events_scope_date
  ON financial_investment_events(source_sha256, region_id, ro_id, event_date);
CREATE INDEX idx_financial_events_product
  ON financial_investment_events(source_sha256, source_product);
CREATE INDEX idx_financial_events_customer
  ON financial_investment_events(source_sha256, customer_id);
