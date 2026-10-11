import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/superset", workers: 1, fullyParallel: false,
  timeout: 120000, expect: { timeout: 45000 }, reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100", browserName: "chromium",
    launchOptions: { executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] },
    // Guest tokens are short lived but still credentials; do not persist network traces.
    trace: "off", screenshot: "only-on-failure",
  },
});
