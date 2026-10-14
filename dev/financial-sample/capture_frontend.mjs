import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:3000";
const OUTPUT = "doc/qa/financial-sample";
const PRIMARY_NAVIGATION = [
  "Dashboard",
  "Investment",
  "Customers",
  "Concentration Risk",
  "Profitability",
  "Target & Run Rate",
  "Export Data",
];
const PAGES = [
  ["dashboard", "/ro/dashboard?source=financial-sample"],
  ["investment", "/ro/investments?source=financial-sample"],
  ["customers", "/ro/customers?source=financial-sample"],
  ["concentration-risk", "/ro/concentration-risk?source=financial-sample"],
  ["profitability", "/ro/profitability?source=financial-sample"],
  ["target-run-rate", "/ro/targets?source=financial-sample"],
  ["export-data", "/ro/reports?source=financial-sample"],
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(context, userId) {
  const response = await context.request.post(`${BASE}/api/auth/login`, { data: { userId } });
  check(response.ok(), `Login failed for ${userId}: ${response.status()}`);
}

async function waitForFinancialDashboard(page) {
  const iframe = page.locator("iframe[title$='— synthetic data']").first();
  await iframe.waitFor({ state: "visible", timeout: 120_000 });
  const frame = iframe.contentFrame();
  await frame.locator(".dashboard-component-chart-holder").first().waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForTimeout(5_000);
  const alerts = await frame.locator(".ant-alert-error").allTextContents();
  check(alerts.length === 0, `Superset rendered an error alert: ${alerts.join(" | ")}`);
  return frame;
}

async function verifyNavigation(page, mobile = false) {
  if (mobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const root = mobile
    ? page.getByRole("dialog", { name: "Main navigation" })
    : page.getByRole("navigation", { name: "Primary navigation" });
  await root.waitFor({ state: "visible" });
  for (const label of PRIMARY_NAVIGATION) {
    await root.getByRole("link", { name: label, exact: true }).waitFor({ state: "visible" });
  }
  for (const removed of ["My Portfolio", "Regional Portfolio", "Portfolio Movement", "Investments & Deals", "Maturities & Rollovers"]) {
    check(await root.getByRole("link", { name: removed, exact: true }).count() === 0, `${removed} remains in primary navigation.`);
  }
}

async function expandFirstChart(frame) {
  const chart = frame.locator(".dashboard-component-chart-holder").first();
  await chart.hover();
  const selectors = [
    '[data-test="chart-context-menu"]',
    'button[aria-label="More Options"]',
    'button[aria-label="More options"]',
    '.chart-header button',
  ];
  let control;
  for (const selector of selectors) {
    const candidate = frame.locator(selector).first();
    if (await candidate.count() && await candidate.isVisible()) {
      control = candidate;
      break;
    }
  }
  if (!control) {
    const controls = await frame.locator("button").evaluateAll(buttons => buttons.map(button => ({
      label: button.getAttribute("aria-label"),
      title: button.getAttribute("title"),
      text: button.textContent?.trim(),
    })).filter(item => item.label || item.title || item.text));
    throw new Error(`No chart menu control was visible. Buttons: ${JSON.stringify(controls.slice(0, 30))}`);
  }
  await control.click();
  const fullscreen = frame.getByText(/enter full.?screen|full.?screen/i).first();
  await fullscreen.waitFor({ state: "visible", timeout: 10_000 });
  await fullscreen.click();
  await frame.locator(".dashboard-component-chart-holder").first().waitFor({ state: "visible" });
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});

if (process.argv.includes("--mobile-only")) {
  try {
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobile.newPage();
    await login(mobile, "USR-RO-001");
    await page.goto(`${BASE}/ro/dashboard?source=financial-sample`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const frame = await waitForFinancialDashboard(page);
    await frame.locator("canvas").first().waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(30_000);
    check(await frame.locator(".ant-alert-error").count() === 0, "Superset rendered an error alert on mobile.");
    await verifyNavigation(page, true);
    await page.screenshot({ path: `${OUTPUT}/mobile-sidebar.png`, fullPage: true });
    console.log("Mobile screenshot captured after the dashboard settled.");
    await mobile.close();
  } finally {
    await browser.close();
  }
  process.exit(0);
}

const results = { guestTokens: [], chartQueries: [], screenshots: [], nativeFilters: false, fullscreen: false, accessRestriction: false };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("response", response => {
    if (response.url().includes("/api/superset/guest-token")) results.guestTokens.push(response.status());
    if (response.url().includes("/api/v1/chart/data")) results.chartQueries.push(response.status());
  });
  await login(context, "USR-RO-001");

  for (const [name, route] of PAGES) {
    console.log(`Verifying ${name}...`);
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (name === "dashboard") await page.getByText("1,000-event Financial Sample · Synthetic Data", { exact: true }).waitFor({ state: "visible" });
    else await page.getByText("Synthetic financial sample", { exact: true }).waitFor({ state: "visible" });
    if (name === "dashboard") await verifyNavigation(page);
    const frame = await waitForFinancialDashboard(page);
    const filterButton = frame.getByRole("button", { name: /filter/i }).first();
    results.nativeFilters ||= Boolean(await filterButton.count());
    if (name === "customers") {
      await page.getByRole("heading", { name: "Customer Records", exact: true }).waitFor({ state: "visible" });
      await page.getByPlaceholder("Search customers").waitFor({ state: "visible" });
    }
    if (name === "export-data") {
      await page.getByRole("link", { name: "Download scoped CSV", exact: true }).waitFor({ state: "visible" });
    }
    const screenshot = `${OUTPUT}/${name}-desktop.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    results.screenshots.push(screenshot);
    if (name === "dashboard") {
      await expandFirstChart(frame);
      results.fullscreen = true;
      const expanded = `${OUTPUT}/expanded-chart-desktop.png`;
      await page.screenshot({ path: expanded, fullPage: true });
      results.screenshots.push(expanded);
    }
  }

  const denied = await page.goto(`${BASE}/regional/dashboard?source=financial-sample`, { waitUntil: "domcontentloaded" });
  check(denied?.ok(), "Cross-role denial page did not load.");
  await page.getByRole("heading", { name: "403 — Access Restricted" }).waitFor({ state: "visible" });
  results.accessRestriction = true;
  console.log("Verified RO access restriction.");
  await context.close();

  const manager = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const managerPage = await manager.newPage();
  await login(manager, "USR-RM-001");
  await managerPage.goto(`${BASE}/regional/dashboard?source=financial-sample`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await verifyNavigation(managerPage);
  await waitForFinancialDashboard(managerPage);
  console.log("Verified Regional Manager dashboard.");
  await manager.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await login(mobile, "USR-RO-001");
  await mobilePage.goto(`${BASE}/ro/dashboard?source=financial-sample`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitForFinancialDashboard(mobilePage);
  await verifyNavigation(mobilePage, true);
  console.log("Verified mobile navigation.");
  const mobileShot = `${OUTPUT}/mobile-sidebar.png`;
  await mobilePage.screenshot({ path: mobileShot, fullPage: true });
  results.screenshots.push(mobileShot);
  await mobile.close();

  check(results.guestTokens.length >= PAGES.length, "Not every page requested a guest token.");
  check(results.guestTokens.every(status => status === 200), `Guest-token failures: ${results.guestTokens.join(",")}`);
  check(results.chartQueries.length > 0 && results.chartQueries.every(status => status === 200), `Chart query failures: ${results.chartQueries.join(",")}`);
  check(results.nativeFilters, "Native filter access was not found.");
  check(results.fullscreen, "Full-screen chart control was not verified.");
  check(results.accessRestriction, "RO cross-role restriction was not verified.");
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
