import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/demo-v2",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3200",
    browserName: "chromium",
    launchOptions: { executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev --webpack --port 3200 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3200/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      MIS_DATA_MODE: "demo-v2",
      MIS_DEMO_V2_ALLOWED: "true",
      MIS_DEMO_V2_RUNTIME: "test",
      MIS_DEMO_V2_SQLITE_PATH: "/home/uplix/MIS/.local/mis-demo-v2/reporting.sqlite",
      SESSION_SECRET: "demo-v2-playwright-session-secret",
      // The ordinary data-mode suite proves that disabled analytics cannot
      // issue a guest token. The real embedding suite opts in explicitly.
      PIS_SUPERSET_LOCAL_ENABLED: "false",
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: "/home/uplix/MIS/dev/next-font-mock.cjs",
    },
  },
});
