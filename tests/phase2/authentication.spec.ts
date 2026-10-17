import { createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "@playwright/test";
import { csrfHeaders, csrfPost, loginAs } from "../helpers/auth";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string): Buffer {
  let bits = "";
  for (const character of value) bits += ALPHABET.indexOf(character).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

test.describe.serial("self-hosted identity security", () => {
  test("login requires CSRF and valid local credentials, then logout revokes the opaque session", async ({ page }) => {
    const password = process.env.MIS_E2E_PASSWORD!;
    const denied = await page.request.post("/api/auth/login", { data: { username: "USR-RO-001", password } });
    expect(denied.status()).toBe(403);
    const invalid = await page.request.post("/api/auth/login", {
      data: { username: "USR-RO-001", password: `${password}x` }, headers: await csrfHeaders(page),
    });
    expect(invalid.status()).toBe(401);
    const success = await page.request.post("/api/auth/login", {
      data: { username: "USR-RO-001", password }, headers: await csrfHeaders(page),
    });
    expect(success.status()).toBe(200);
    const cookie = success.headers()["set-cookie"];
    expect(cookie).toContain("mis_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=strict");
    expect(cookie).not.toContain("USR-RO-001");
    expect((await page.request.get("/ro/dashboard")).status()).toBe(200);
    expect((await csrfPost(page, "/api/auth/logout")).status()).toBe(200);
    expect((await page.request.get("/ro/dashboard")).url()).toContain("/login");
  });

  test("login throttling blocks repeated invalid credentials", async ({ page }) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await page.request.post("/api/auth/login", {
        data: { username: "unknown-throttle-user", password: "Wrong-password-1!" }, headers: await csrfHeaders(page),
      });
      expect(response.status()).toBe(401);
    }
    const blocked = await page.request.post("/api/auth/login", {
      data: { username: "unknown-throttle-user", password: "Wrong-password-1!" }, headers: await csrfHeaders(page),
    });
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
  });

  test("MFA protects privileged lifecycle actions and disabled providers cannot be linked", async ({ page }) => {
    const password = process.env.MIS_E2E_PASSWORD!;
    const databasePath = process.env.MIS_IDENTITY_DB_PATH!;
    await loginAs(page, "USR-RM-001");
    expect((await csrfPost(page, "/api/admin/users", { data: { action: "revoke-sessions", userId: "USR-RO-003" } })).status()).toBe(428);

    const started = await csrfPost(page, "/api/auth/mfa/enroll", { data: { action: "start", currentPassword: password } });
    expect(started.status(), await started.text()).toBe(200);
    const enrollment = await started.json() as { factorId: string; secret: string };
    const confirmed = await csrfPost(page, "/api/auth/mfa/enroll", { data: { action: "confirm", factorId: enrollment.factorId, code: totp(enrollment.secret) } });
    expect(confirmed.status(), await confirmed.text()).toBe(200);

    try {
      expect((await page.request.get("/api/admin/users")).status()).toBe(200);
      const disabledProvider = await csrfPost(page, "/api/admin/users", {
        data: { action: "link-provider", userId: "USR-RO-003", provider: "microsoft_entra", subject: "unverified-subject", verified: true },
      });
      expect(disabledProvider.status()).toBe(400);
      expect((await disabledProvider.json()).error).toContain("disabled");

      const suspended = await csrfPost(page, "/api/admin/users", { data: { action: "update", userId: "USR-RO-003", status: "suspended" } });
      expect(suspended.status(), await suspended.text()).toBe(200);
      const rejected = await page.request.post("/api/auth/login", {
        data: { username: "USR-RO-003", password }, headers: await csrfHeaders(page),
      });
      expect(rejected.status()).toBe(401);
      const restored = await csrfPost(page, "/api/admin/users", { data: { action: "update", userId: "USR-RO-003", status: "active" } });
      expect(restored.status(), await restored.text()).toBe(200);
      const audit = await page.request.get("/api/admin/audit");
      expect(audit.status()).toBe(200);
      expect(JSON.stringify(await audit.json())).toContain("identity.user.updated");
    } finally {
      const database = new DatabaseSync(databasePath);
      database.prepare("UPDATE identity_users SET status = 'active' WHERE id = 'USR-RO-003'").run();
      database.prepare("UPDATE mfa_factors SET disabled_at = ? WHERE user_id = 'USR-RM-001'").run(Date.now());
      database.close();
    }
  });
});
