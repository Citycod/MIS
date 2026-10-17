import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";

const e2ePassword = process.env.MIS_E2E_PASSWORD ??= `A9!${randomBytes(18).toString("base64url")}z`;
const identityKey = randomBytes(32).toString("base64");
const identityDatabase = process.env.MIS_IDENTITY_DB_PATH ??= `/tmp/mis-identity-phase2-${process.pid}.sqlite`;
export default defineConfig({
  testDir: "./tests/phase2",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    launchOptions: { executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm start --port 3100 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3100/login",
    env: {
      MIS_CSV_IMPORT_ENABLED: "true",
      MIS_IDENTITY_TEST_MODE: "true",
      MIS_E2E_PASSWORD: e2ePassword,
      MIS_IDENTITY_DB_PATH: identityDatabase,
      MIS_IDENTITY_ENCRYPTION_KEY: identityKey,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
