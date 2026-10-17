CREATE TABLE IF NOT EXISTS identity_users (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  branch_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'deactivated')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_configs (
  provider TEXT PRIMARY KEY CHECK (provider IN ('local', 'microsoft_entra', 'odoo_federation', 'enterprise_oidc', 'enterprise_saml')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS authentication_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL REFERENCES provider_configs(provider),
  provider_subject TEXT NOT NULL,
  username_normalized TEXT,
  verified_at INTEGER,
  approved_by_user_id TEXT REFERENCES identity_users(id),
  linked_at INTEGER NOT NULL,
  disabled_at INTEGER,
  UNIQUE(provider, provider_subject),
  UNIQUE(provider, username_normalized)
);

CREATE TABLE IF NOT EXISTS local_credentials (
  identity_id TEXT PRIMARY KEY REFERENCES authentication_identities(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_changed_at INTEGER NOT NULL,
  must_change INTEGER NOT NULL DEFAULT 0 CHECK (must_change IN (0, 1))
);

CREATE TABLE IF NOT EXISTS organizational_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('RO', 'REGIONAL_MANAGER')),
  region_id TEXT NOT NULL,
  ro_id TEXT,
  allowed_region_ids_json TEXT NOT NULL,
  allowed_ro_ids_json TEXT NOT NULL,
  effective_from INTEGER NOT NULL,
  effective_to INTEGER,
  created_by_user_id TEXT REFERENCES identity_users(id),
  created_at INTEGER NOT NULL,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_assignment_current
  ON organizational_assignments(user_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  effective_from INTEGER NOT NULL,
  effective_to INTEGER,
  granted_by_user_id TEXT REFERENCES identity_users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, permission, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  idle_expires_at INTEGER NOT NULL,
  absolute_expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  auth_provider TEXT NOT NULL REFERENCES provider_configs(provider),
  mfa_verified INTEGER NOT NULL DEFAULT 0 CHECK (mfa_verified IN (0, 1)),
  ip_hash TEXT,
  user_agent_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  bucket_key TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  occurred_at INTEGER NOT NULL,
  actor_user_id TEXT REFERENCES identity_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'denied')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_user_id, occurred_at DESC);

INSERT OR IGNORE INTO provider_configs(provider, enabled, config_json, updated_at)
VALUES
  ('local', 1, '{}', unixepoch() * 1000),
  ('microsoft_entra', 0, '{}', unixepoch() * 1000),
  ('odoo_federation', 0, '{}', unixepoch() * 1000),
  ('enterprise_oidc', 0, '{}', unixepoch() * 1000),
  ('enterprise_saml', 0, '{}', unixepoch() * 1000);
