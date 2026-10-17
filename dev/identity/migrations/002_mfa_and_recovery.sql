CREATE TABLE IF NOT EXISTS mfa_factors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL CHECK (factor_type IN ('totp')),
  label TEXT NOT NULL,
  secret_ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER,
  disabled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mfa_user ON mfa_factors(user_id, verified_at, disabled_at);

CREATE TABLE IF NOT EXISTS authentication_challenges (
  challenge_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('mfa_login', 'mfa_enrollment')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER
);

CREATE TABLE IF NOT EXISTS password_recovery_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  requested_at INTEGER NOT NULL,
  requested_by_user_id TEXT REFERENCES identity_users(id),
  approved_at INTEGER,
  approved_by_user_id TEXT REFERENCES identity_users(id),
  completed_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'completed', 'rejected'))
);
