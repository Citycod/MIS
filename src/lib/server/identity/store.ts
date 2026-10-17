import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { User } from "@/types/auth";
import { getActiveDataCatalog } from "@/lib/server/repository/data-catalog";
import { getMisDataMode } from "@/lib/server/repository/data-mode";
import { generateTemporaryPassword, hashPassword, validatePassword, verifyPassword } from "./password";
import { decryptSecret, encryptSecret, generateTotpSecret, totpProvisioningUri, verifyTotp } from "./totp";
import type {
  AuditContext,
  AuditOutcome,
  CreateIdentityUserInput,
  IdentityProvider,
  ManagedIdentityUser,
  UpdateIdentityUserInput,
} from "./types";

type SqlRow = Record<string, string | number | null>;
type Runtime = typeof globalThis & { misIdentityDatabases?: Map<string, DatabaseSync> };

const MANAGE_USERS_PERMISSION = "identity.users.manage";
const READ_AUDIT_PERMISSION = "identity.audit.read";
const SESSION_IDLE_MS = Number(process.env.MIS_SESSION_IDLE_MINUTES ?? 30) * 60_000;
const SESSION_ABSOLUTE_MS = Number(process.env.MIS_SESSION_ABSOLUTE_HOURS ?? 8) * 3_600_000;
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_BLOCK_MS = 15 * 60_000;
const MAX_LOGIN_FAILURES = 5;

function timestamp(): number { return Date.now(); }
function normalized(value: string): string { return value.trim().toLowerCase(); }
function tokenHash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function jsonArray(value: string | number | null): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) && parsed.every(item => typeof item === "string") ? parsed : [];
  } catch { return []; }
}

function databasePath(): string {
  return process.env.MIS_IDENTITY_DB_PATH
    ?? join(process.cwd(), ".local", "mis-identity", `${getMisDataMode()}.sqlite`);
}

function applyMigrations(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)");
  const directory = join(process.cwd(), "dev", "identity", "migrations");
  for (const filename of readdirSync(directory).filter(name => /^\d+_.+\.sql$/u.test(name)).sort()) {
    const version = Number.parseInt(filename.split("_", 1)[0], 10);
    const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get(version);
    if (applied) continue;
    const sql = readFileSync(join(directory, filename), "utf8");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)").run(version, filename, timestamp());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function seedCatalog(db: DatabaseSync): void {
  const catalog = getActiveDataCatalog();
  const now = timestamp();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const user of Object.values(catalog.users)) {
      db.prepare(`INSERT OR IGNORE INTO identity_users
        (id, staff_id, display_name, email, title, branch_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
        .run(user.id, user.id, user.name, normalized(user.email), user.title, user.branchName ?? null, now, now);
      const identityId = `local:${user.id}`;
      db.prepare(`INSERT OR IGNORE INTO authentication_identities
        (id, user_id, provider, provider_subject, username_normalized, verified_at, linked_at)
        VALUES (?, ?, 'local', ?, ?, ?, ?)`)
        .run(identityId, user.id, user.id, normalized(user.email), now, now);
      const assignment = db.prepare("SELECT 1 FROM organizational_assignments WHERE user_id = ? LIMIT 1").get(user.id);
      if (!assignment) {
        db.prepare(`INSERT INTO organizational_assignments
          (id, user_id, role, region_id, ro_id, allowed_region_ids_json, allowed_ro_ids_json, effective_from, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), user.id, user.role, user.regionId, user.roId ?? null,
            JSON.stringify(user.allowedRegionIds), JSON.stringify(user.allowedRoIds), 0, now);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const configuredAdmin = process.env.MIS_BOOTSTRAP_ADMIN_USER_ID;
  const fallbackAdmin = Object.values(catalog.users).find(user => user.role === "REGIONAL_MANAGER")?.id;
  const adminUserId = configuredAdmin || (process.env.NODE_ENV === "production" ? undefined : fallbackAdmin);
  if (!adminUserId || !db.prepare("SELECT 1 FROM identity_users WHERE id = ?").get(adminUserId)) return;

  for (const permission of [MANAGE_USERS_PERMISSION, READ_AUDIT_PERMISSION]) {
    const existing = db.prepare(`SELECT 1 FROM user_permissions
      WHERE user_id = ? AND permission = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to > ?)`)
      .get(adminUserId, permission, now, now);
    if (!existing) db.prepare(`INSERT INTO user_permissions
      (user_id, permission, effective_from, created_at) VALUES (?, ?, ?, ?)`)
      .run(adminUserId, permission, now, now);
  }

  if (process.env.MIS_IDENTITY_TEST_MODE === "true") {
    const sharedPassword = process.env.MIS_E2E_PASSWORD;
    const path = databasePath();
    if (!sharedPassword || (!path.startsWith("/tmp/") && !path.includes(`${join(".local", "mis-identity")}`))) {
      throw new Error("MIS identity test mode requires MIS_E2E_PASSWORD and an isolated /tmp or .local identity database.");
    }
    const problem = validatePassword(sharedPassword);
    if (problem) throw new Error(`MIS_E2E_PASSWORD is invalid: ${problem}`);
    for (const user of Object.values(catalog.users)) {
      const identity = db.prepare("SELECT id FROM authentication_identities WHERE user_id = ? AND provider = 'local'").get(user.id) as SqlRow | undefined;
      if (identity) db.prepare(`INSERT OR IGNORE INTO local_credentials(identity_id, password_hash, password_changed_at, must_change)
        VALUES (?, ?, ?, 0)`).run(String(identity.id), hashPassword(sharedPassword), now);
    }
    return;
  }

  const credentialCount = Number((db.prepare("SELECT COUNT(*) AS count FROM local_credentials").get() as SqlRow).count ?? 0);
  if (credentialCount > 0) return;
  const identity = db.prepare("SELECT id, username_normalized FROM authentication_identities WHERE user_id = ? AND provider = 'local'").get(adminUserId) as SqlRow | undefined;
  if (!identity) return;
  const generated = !process.env.MIS_BOOTSTRAP_PASSWORD;
  const password = process.env.MIS_BOOTSTRAP_PASSWORD || generateTemporaryPassword();
  const problem = validatePassword(password, String(identity.username_normalized));
  if (problem) throw new Error(`MIS_BOOTSTRAP_PASSWORD is invalid: ${problem}`);
  db.prepare(`INSERT INTO local_credentials(identity_id, password_hash, password_changed_at, must_change)
    VALUES (?, ?, ?, 1)`).run(String(identity.id), hashPassword(password), now);
  if (generated) {
    const path = join(dirname(databasePath()), "bootstrap-credentials.txt");
    writeFileSync(path, `One-time MIS bootstrap credential\nStaff ID: ${adminUserId}\nPassword: ${password}\nChange this password immediately after signing in.\n`, { mode: 0o600 });
    chmodSync(path, 0o600);
    console.warn(`MIS identity bootstrap credential written to ${path}`);
  }
}

export function getIdentityDatabase(): DatabaseSync {
  const path = databasePath();
  const runtime = globalThis as Runtime;
  const cache = runtime.misIdentityDatabases ??= new Map<string, DatabaseSync>();
  const cached = cache.get(path);
  if (cached) return cached;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000");
  applyMigrations(db);
  seedCatalog(db);
  cache.set(path, db);
  return db;
}

function currentAssignment(db: DatabaseSync, userId: string, now = timestamp()): SqlRow | undefined {
  return db.prepare(`SELECT * FROM organizational_assignments
    WHERE user_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to > ?)
    ORDER BY effective_from DESC LIMIT 1`).get(userId, now, now) as SqlRow | undefined;
}

function permissionsFor(db: DatabaseSync, userId: string, now = timestamp()): string[] {
  return (db.prepare(`SELECT permission FROM user_permissions
    WHERE user_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to > ?)
    ORDER BY permission`).all(userId, now, now) as SqlRow[]).map(row => String(row.permission));
}

export function getManagedIdentityUser(userId: string): ManagedIdentityUser | null {
  const db = getIdentityDatabase();
  const row = db.prepare("SELECT * FROM identity_users WHERE id = ?").get(userId) as SqlRow | undefined;
  const assignment = currentAssignment(db, userId);
  if (!row || !assignment) return null;
  const providers = (db.prepare(`SELECT DISTINCT provider FROM authentication_identities
    WHERE user_id = ? AND disabled_at IS NULL ORDER BY provider`).all(userId) as SqlRow[])
    .map(item => String(item.provider) as IdentityProvider);
  const mfaEnabled = Boolean(db.prepare(`SELECT 1 FROM mfa_factors
    WHERE user_id = ? AND verified_at IS NOT NULL AND disabled_at IS NULL LIMIT 1`).get(userId));
  const credential = db.prepare(`SELECT lc.must_change FROM local_credentials lc
    JOIN authentication_identities ai ON ai.id = lc.identity_id
    WHERE ai.user_id = ? AND ai.provider = 'local' AND ai.disabled_at IS NULL`).get(userId) as SqlRow | undefined;
  return {
    id: String(row.id), staffId: String(row.staff_id), displayName: String(row.display_name), email: String(row.email),
    title: String(row.title), branchName: row.branch_name ? String(row.branch_name) : undefined,
    status: String(row.status) as ManagedIdentityUser["status"], role: String(assignment.role) as ManagedIdentityUser["role"],
    regionId: String(assignment.region_id), roId: assignment.ro_id ? String(assignment.ro_id) : undefined,
    allowedRegionIds: jsonArray(assignment.allowed_region_ids_json), allowedRoIds: jsonArray(assignment.allowed_ro_ids_json),
    permissions: permissionsFor(db, userId), providers, mfaEnabled, mustChangePassword: Number(credential?.must_change ?? 0) === 1,
  };
}

export function identityUserToApplicationUser(identity: ManagedIdentityUser): User {
  return {
    id: identity.id, name: identity.displayName, email: identity.email, title: identity.title,
    branchName: identity.branchName, role: identity.role, regionId: identity.regionId, roId: identity.roId,
    allowedRegionIds: identity.allowedRegionIds, allowedRoIds: identity.allowedRoIds,
  };
}

export function listManagedIdentityUsers(): ManagedIdentityUser[] {
  const db = getIdentityDatabase();
  return (db.prepare("SELECT id FROM identity_users ORDER BY display_name").all() as SqlRow[])
    .map(row => getManagedIdentityUser(String(row.id))).filter((user): user is ManagedIdentityUser => Boolean(user));
}

export function recordAudit(context: AuditContext, action: string, outcome: AuditOutcome, targetType?: string, targetId?: string, metadata: Record<string, unknown> = {}): void {
  getIdentityDatabase().prepare(`INSERT INTO audit_events
    (id, occurred_at, actor_user_id, action, target_type, target_id, outcome, ip_hash, user_agent_hash, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), timestamp(), context.actorUserId ?? null, action, targetType ?? null, targetId ?? null, outcome,
      context.ip ? tokenHash(context.ip) : null, context.userAgent ? tokenHash(context.userAgent) : null, JSON.stringify(metadata));
}

export function listAuditEvents(limit = 100): SqlRow[] {
  return getIdentityDatabase().prepare(`SELECT id, occurred_at, actor_user_id, action, target_type, target_id, outcome, metadata_json
    FROM audit_events ORDER BY occurred_at DESC LIMIT ?`).all(Math.min(Math.max(limit, 1), 250)) as SqlRow[];
}

export function hasIdentityPermission(userId: string, permission: string): boolean {
  return permissionsFor(getIdentityDatabase(), userId).includes(permission);
}

export function hasVerifiedMfa(userId: string): boolean {
  return Boolean(getIdentityDatabase().prepare(`SELECT 1 FROM mfa_factors
    WHERE user_id = ? AND verified_at IS NOT NULL AND disabled_at IS NULL LIMIT 1`).get(userId));
}

export function findLocalCredential(username: string): { user: ManagedIdentityUser; passwordHash: string } | null {
  const db = getIdentityDatabase();
  const value = normalized(username);
  const row = db.prepare(`SELECT ai.user_id, lc.password_hash FROM authentication_identities ai
    JOIN identity_users u ON u.id = ai.user_id
    JOIN local_credentials lc ON lc.identity_id = ai.id
    JOIN provider_configs pc ON pc.provider = ai.provider
    WHERE ai.provider = 'local' AND pc.enabled = 1 AND ai.disabled_at IS NULL
      AND (ai.username_normalized = ? OR lower(u.staff_id) = ?)
    LIMIT 1`).get(value, value) as SqlRow | undefined;
  if (!row) return null;
  const user = getManagedIdentityUser(String(row.user_id));
  return user ? { user, passwordHash: String(row.password_hash) } : null;
}

export function verifyLocalCredential(username: string, password: string): ManagedIdentityUser | null {
  const result = findLocalCredential(username);
  if (!result || !verifyPassword(password, result.passwordHash) || result.user.status !== "active") return null;
  return result.user;
}

export function loginThrottleKey(username: string, ip: string | null): string {
  return tokenHash(`${normalized(username)}\u0000${ip ?? "unknown"}`);
}

export function loginThrottleStatus(bucketKey: string): { allowed: boolean; retryAfterSeconds: number } {
  const row = getIdentityDatabase().prepare("SELECT * FROM login_attempts WHERE bucket_key = ?").get(bucketKey) as SqlRow | undefined;
  const blockedUntil = Number(row?.blocked_until ?? 0);
  return blockedUntil > timestamp()
    ? { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - timestamp()) / 1000) }
    : { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(bucketKey: string): void {
  const db = getIdentityDatabase();
  const now = timestamp();
  const row = db.prepare("SELECT * FROM login_attempts WHERE bucket_key = ?").get(bucketKey) as SqlRow | undefined;
  const insideWindow = row && now - Number(row.window_started_at) < LOGIN_WINDOW_MS;
  const failures = insideWindow ? Number(row.failure_count) + 1 : 1;
  const windowStarted = insideWindow ? Number(row.window_started_at) : now;
  const blockedUntil = failures >= MAX_LOGIN_FAILURES ? now + LOGIN_BLOCK_MS : null;
  db.prepare(`INSERT INTO login_attempts(bucket_key, failure_count, window_started_at, blocked_until)
    VALUES (?, ?, ?, ?) ON CONFLICT(bucket_key) DO UPDATE SET
    failure_count = excluded.failure_count, window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until`)
    .run(bucketKey, failures, windowStarted, blockedUntil);
}

export function clearLoginFailures(bucketKey: string): void {
  getIdentityDatabase().prepare("DELETE FROM login_attempts WHERE bucket_key = ?").run(bucketKey);
}

export function createServerSession(userId: string, provider: IdentityProvider, mfaVerified: boolean, ip: string | null, userAgent: string | null): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("base64url");
  const now = timestamp();
  const absolute = now + SESSION_ABSOLUTE_MS;
  getIdentityDatabase().prepare(`INSERT INTO sessions
    (token_hash, user_id, created_at, last_seen_at, idle_expires_at, absolute_expires_at, auth_provider, mfa_verified, ip_hash, user_agent_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(tokenHash(token), userId, now, now, Math.min(now + SESSION_IDLE_MS, absolute), absolute, provider, mfaVerified ? 1 : 0,
      ip ? tokenHash(ip) : null, userAgent ? tokenHash(userAgent) : null);
  return { token, expiresAt: absolute };
}

export interface LoadedIdentitySession {
  tokenHash: string;
  user: ManagedIdentityUser;
  createdAt: number;
  expiresAt: number;
  mfaVerified: boolean;
  authProvider: IdentityProvider;
}

export function loadServerSession(token: string): LoadedIdentitySession | null {
  if (!/^[A-Za-z0-9_-]{40,100}$/u.test(token)) return null;
  const db = getIdentityDatabase();
  const hash = tokenHash(token);
  const row = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(hash) as SqlRow | undefined;
  const now = timestamp();
  if (!row || row.revoked_at || Number(row.idle_expires_at) <= now || Number(row.absolute_expires_at) <= now) {
    if (row && !row.revoked_at) db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?").run(now, hash);
    return null;
  }
  const user = getManagedIdentityUser(String(row.user_id));
  if (!user || user.status !== "active") {
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(now, hash);
    return null;
  }
  if (now - Number(row.last_seen_at) >= 60_000) {
    db.prepare("UPDATE sessions SET last_seen_at = ?, idle_expires_at = ? WHERE token_hash = ?")
      .run(now, Math.min(now + SESSION_IDLE_MS, Number(row.absolute_expires_at)), hash);
  }
  return { tokenHash: hash, user, createdAt: Number(row.created_at), expiresAt: Number(row.absolute_expires_at),
    mfaVerified: Number(row.mfa_verified) === 1, authProvider: String(row.auth_provider) as IdentityProvider };
}

export function revokeSessionByToken(token: string): string | null {
  const db = getIdentityDatabase();
  const hash = tokenHash(token);
  const row = db.prepare("SELECT user_id FROM sessions WHERE token_hash = ?").get(hash) as SqlRow | undefined;
  if (!row) return null;
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(timestamp(), hash);
  return String(row.user_id);
}

export function revokeUserSessions(userId: string, exceptTokenHash?: string): number {
  const result = exceptTokenHash
    ? getIdentityDatabase().prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND token_hash <> ? AND revoked_at IS NULL").run(timestamp(), userId, exceptTokenHash)
    : getIdentityDatabase().prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(timestamp(), userId);
  return Number(result.changes);
}

export function setSessionMfaVerified(sessionTokenHash: string): void {
  getIdentityDatabase().prepare("UPDATE sessions SET mfa_verified = 1 WHERE token_hash = ? AND revoked_at IS NULL").run(sessionTokenHash);
}

export function createAuthenticationChallenge(userId: string, purpose: "mfa_login" | "mfa_enrollment"): string {
  const token = randomBytes(32).toString("base64url");
  const now = timestamp();
  getIdentityDatabase().prepare(`INSERT INTO authentication_challenges
    (challenge_hash, user_id, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
    .run(tokenHash(token), userId, purpose, now, now + 5 * 60_000);
  return token;
}

export function consumeMfaLoginChallenge(token: string, code: string): string | null {
  const db = getIdentityDatabase();
  const hash = tokenHash(token);
  const row = db.prepare(`SELECT * FROM authentication_challenges
    WHERE challenge_hash = ? AND purpose = 'mfa_login' AND consumed_at IS NULL`).get(hash) as SqlRow | undefined;
  const now = timestamp();
  if (!row || Number(row.expires_at) <= now || Number(row.attempts) >= 5) return null;
  db.prepare("UPDATE authentication_challenges SET attempts = attempts + 1 WHERE challenge_hash = ?").run(hash);
  const factor = db.prepare(`SELECT secret_ciphertext FROM mfa_factors
    WHERE user_id = ? AND verified_at IS NOT NULL AND disabled_at IS NULL ORDER BY verified_at DESC LIMIT 1`)
    .get(String(row.user_id)) as SqlRow | undefined;
  if (!factor || !verifyTotp(decryptSecret(String(factor.secret_ciphertext)), code)) return null;
  db.prepare("UPDATE authentication_challenges SET consumed_at = ? WHERE challenge_hash = ?").run(now, hash);
  return String(row.user_id);
}

export function beginTotpEnrollment(userId: string): { factorId: string; secret: string; uri: string } {
  const db = getIdentityDatabase();
  db.prepare("UPDATE mfa_factors SET disabled_at = ? WHERE user_id = ? AND verified_at IS NULL AND disabled_at IS NULL").run(timestamp(), userId);
  const secret = generateTotpSecret();
  const factorId = randomUUID();
  const user = getManagedIdentityUser(userId);
  if (!user) throw new Error("Unknown user.");
  db.prepare(`INSERT INTO mfa_factors(id, user_id, factor_type, label, secret_ciphertext, created_at)
    VALUES (?, ?, 'totp', 'Authenticator app', ?, ?)`)
    .run(factorId, userId, encryptSecret(secret), timestamp());
  return { factorId, secret, uri: totpProvisioningUri(secret, user.staffId) };
}

export function confirmTotpEnrollment(userId: string, factorId: string, code: string): boolean {
  const db = getIdentityDatabase();
  const row = db.prepare(`SELECT secret_ciphertext FROM mfa_factors
    WHERE id = ? AND user_id = ? AND verified_at IS NULL AND disabled_at IS NULL`).get(factorId, userId) as SqlRow | undefined;
  if (!row || !verifyTotp(decryptSecret(String(row.secret_ciphertext)), code)) return false;
  db.prepare("UPDATE mfa_factors SET verified_at = ? WHERE id = ?").run(timestamp(), factorId);
  return true;
}

export function changeLocalPassword(userId: string, currentPassword: string, newPassword: string, sessionTokenHash: string): string | null {
  const db = getIdentityDatabase();
  const row = db.prepare(`SELECT lc.identity_id, lc.password_hash, u.staff_id FROM local_credentials lc
    JOIN authentication_identities ai ON ai.id = lc.identity_id JOIN identity_users u ON u.id = ai.user_id
    WHERE ai.user_id = ? AND ai.provider = 'local' AND ai.disabled_at IS NULL`).get(userId) as SqlRow | undefined;
  if (!row || !verifyPassword(currentPassword, String(row.password_hash))) return "Current password is incorrect.";
  const problem = validatePassword(newPassword, String(row.staff_id));
  if (problem) return problem;
  db.prepare("UPDATE local_credentials SET password_hash = ?, password_changed_at = ?, must_change = 0 WHERE identity_id = ?")
    .run(hashPassword(newPassword), timestamp(), String(row.identity_id));
  revokeUserSessions(userId, sessionTokenHash);
  return null;
}

export function createManagedIdentityUser(input: CreateIdentityUserInput, context: AuditContext): ManagedIdentityUser {
  const db = getIdentityDatabase();
  const now = timestamp();
  const problem = validatePassword(input.temporaryPassword, input.staffId);
  if (problem) throw new Error(problem);
  if (!/^[A-Za-z0-9._-]{3,64}$/u.test(input.id) || !/^[A-Za-z0-9._-]{3,64}$/u.test(input.staffId)) throw new Error("User ID and staff ID contain invalid characters.");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO identity_users
      (id, staff_id, display_name, email, title, branch_name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
      .run(input.id, input.staffId, input.displayName.trim(), normalized(input.email), input.title.trim(), input.branchName?.trim() || null, now, now);
    const identityId = `local:${input.id}`;
    db.prepare(`INSERT INTO authentication_identities
      (id, user_id, provider, provider_subject, username_normalized, verified_at, approved_by_user_id, linked_at)
      VALUES (?, ?, 'local', ?, ?, ?, ?, ?)`)
      .run(identityId, input.id, input.id, normalized(input.email), now, context.actorUserId ?? null, now);
    db.prepare("INSERT INTO local_credentials(identity_id, password_hash, password_changed_at, must_change) VALUES (?, ?, ?, 1)")
      .run(identityId, hashPassword(input.temporaryPassword), now);
    db.prepare(`INSERT INTO organizational_assignments
      (id, user_id, role, region_id, ro_id, allowed_region_ids_json, allowed_ro_ids_json, effective_from, created_by_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), input.id, input.role, input.regionId, input.roId ?? null, JSON.stringify(input.allowedRegionIds),
        JSON.stringify(input.allowedRoIds), now, context.actorUserId ?? null, now);
    if (input.canManageUsers) {
      for (const permission of [MANAGE_USERS_PERMISSION, READ_AUDIT_PERMISSION]) db.prepare(`INSERT INTO user_permissions
        (user_id, permission, effective_from, granted_by_user_id, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(input.id, permission, now, context.actorUserId ?? null, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  recordAudit(context, "identity.user.provisioned", "success", "user", input.id, { role: input.role, regionId: input.regionId });
  return getManagedIdentityUser(input.id)!;
}

export function updateManagedIdentityUser(userId: string, input: UpdateIdentityUserInput, context: AuditContext): ManagedIdentityUser {
  const db = getIdentityDatabase();
  const current = getManagedIdentityUser(userId);
  if (!current) throw new Error("User not found.");
  const now = timestamp();
  const next = {
    role: input.role ?? current.role, regionId: input.regionId ?? current.regionId,
    roId: input.roId === null ? undefined : input.roId ?? current.roId,
    allowedRegionIds: input.allowedRegionIds ?? current.allowedRegionIds,
    allowedRoIds: input.allowedRoIds ?? current.allowedRoIds,
  };
  const assignmentChanged = JSON.stringify(next) !== JSON.stringify({
    role: current.role, regionId: current.regionId, roId: current.roId,
    allowedRegionIds: current.allowedRegionIds, allowedRoIds: current.allowedRoIds,
  });
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`UPDATE identity_users SET display_name = ?, email = ?, title = ?, branch_name = ?, status = ?, updated_at = ? WHERE id = ?`)
      .run(input.displayName?.trim() ?? current.displayName, normalized(input.email ?? current.email), input.title?.trim() ?? current.title,
        input.branchName?.trim() ?? current.branchName ?? null, input.status ?? current.status, now, userId);
    if (assignmentChanged) {
      db.prepare("UPDATE organizational_assignments SET effective_to = ? WHERE user_id = ? AND effective_to IS NULL").run(now, userId);
      db.prepare(`INSERT INTO organizational_assignments
        (id, user_id, role, region_id, ro_id, allowed_region_ids_json, allowed_ro_ids_json, effective_from, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), userId, next.role, next.regionId, next.roId ?? null, JSON.stringify(next.allowedRegionIds),
          JSON.stringify(next.allowedRoIds), now, context.actorUserId ?? null, now);
    }
    if (typeof input.canManageUsers === "boolean") {
      const active = hasIdentityPermission(userId, MANAGE_USERS_PERMISSION);
      if (input.canManageUsers && !active) {
        for (const permission of [MANAGE_USERS_PERMISSION, READ_AUDIT_PERMISSION]) db.prepare(`INSERT INTO user_permissions
          (user_id, permission, effective_from, granted_by_user_id, created_at) VALUES (?, ?, ?, ?, ?)`)
          .run(userId, permission, now, context.actorUserId ?? null, now);
      } else if (!input.canManageUsers && active) {
        db.prepare(`UPDATE user_permissions SET effective_to = ? WHERE user_id = ? AND permission IN (?, ?) AND effective_to IS NULL`)
          .run(now, userId, MANAGE_USERS_PERMISSION, READ_AUDIT_PERMISSION);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  if (input.status && input.status !== "active") revokeUserSessions(userId);
  recordAudit(context, "identity.user.updated", "success", "user", userId, { changedFields: Object.keys(input) });
  return getManagedIdentityUser(userId)!;
}

export function administratorResetPassword(userId: string, temporaryPassword: string, context: AuditContext): void {
  const db = getIdentityDatabase();
  const user = getManagedIdentityUser(userId);
  if (!user) throw new Error("User not found.");
  const problem = validatePassword(temporaryPassword, user.staffId);
  if (problem) throw new Error(problem);
  const identity = db.prepare("SELECT id FROM authentication_identities WHERE user_id = ? AND provider = 'local' AND disabled_at IS NULL").get(userId) as SqlRow | undefined;
  if (!identity) throw new Error("The user has no active local identity.");
  const now = timestamp();
  db.prepare(`INSERT INTO local_credentials(identity_id, password_hash, password_changed_at, must_change)
    VALUES (?, ?, ?, 1) ON CONFLICT(identity_id) DO UPDATE SET
    password_hash = excluded.password_hash, password_changed_at = excluded.password_changed_at, must_change = 1`)
    .run(String(identity.id), hashPassword(temporaryPassword), now);
  revokeUserSessions(userId);
  recordAudit(context, "identity.password.recovery_approved", "success", "user", userId);
}

export function providerIsEnabled(provider: IdentityProvider): boolean {
  const row = getIdentityDatabase().prepare("SELECT enabled FROM provider_configs WHERE provider = ?").get(provider) as SqlRow | undefined;
  return Number(row?.enabled ?? 0) === 1;
}

export function linkProviderIdentity(userId: string, provider: IdentityProvider, subject: string, verified: boolean, context: AuditContext): void {
  if (provider === "local") throw new Error("Use local account provisioning for local identities.");
  if (!providerIsEnabled(provider)) throw new Error("The authentication provider is disabled.");
  if (!verified || !context.actorUserId) throw new Error("Verified identity and authorized approval are required.");
  getIdentityDatabase().prepare(`INSERT INTO authentication_identities
    (id, user_id, provider, provider_subject, verified_at, approved_by_user_id, linked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), userId, provider, subject, timestamp(), context.actorUserId, timestamp());
  recordAudit(context, "identity.provider.linked", "success", "user", userId, { provider });
}

export function unlinkProviderIdentity(userId: string, provider: Exclude<IdentityProvider, "local">, subject: string, context: AuditContext): void {
  if (!context.actorUserId) throw new Error("Authorized approval is required.");
  const result = getIdentityDatabase().prepare(`UPDATE authentication_identities SET disabled_at = ?
    WHERE user_id = ? AND provider = ? AND provider_subject = ? AND disabled_at IS NULL`)
    .run(timestamp(), userId, provider, subject);
  if (!result.changes) throw new Error("The linked provider identity was not found.");
  revokeUserSessions(userId);
  recordAudit(context, "identity.provider.unlinked", "success", "user", userId, { provider });
}

export const IdentityPermissions = {
  manageUsers: MANAGE_USERS_PERMISSION,
  readAudit: READ_AUDIT_PERMISSION,
} as const;
