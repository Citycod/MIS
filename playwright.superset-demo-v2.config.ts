import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";

const e2ePassword = process.env.MIS_E2E_PASSWORD ??= `A9!${randomBytes(18).toString("base64url")}z`;
const identityDatabase = process.env.MIS_IDENTITY_DB_PATH ??= `/tmp/mis-identity-superset-demo-v2-${process.pid}.sqlite`;

export default defineConfig({
  testDir: "./tests/superset-demo-v2",
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 45000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3200",
    browserName: "chromium",
    launchOptions: { executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] },
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Match the established Phase 2 visual runner. The production server
    // loads the generated Tailwind stylesheet; a webpack dev process has
    // produced unstyled, zero-height embed mounts in this environment.
    command: "pnpm start --port 3200 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3200/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      MIS_DATA_MODE: "demo-v2",
      MIS_DEMO_V2_ALLOWED: "true",
      MIS_DEMO_V2_RUNTIME: "test",
      MIS_DEMO_V2_SQLITE_PATH: "/home/uplix/MIS/.local/mis-demo-v2/reporting.sqlite",
      PIS_SUPERSET_LOCAL_ENABLED: "true",
      SESSION_SECRET: "demo-v2-superset-playwright-session-secret",
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: "/home/uplix/MIS/dev/next-font-mock.cjs",
      MIS_IDENTITY_TEST_MODE: "true",
      MIS_E2E_PASSWORD: e2ePassword,
      MIS_IDENTITY_DB_PATH: identityDatabase,
      MIS_IDENTITY_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    },
  },
});
