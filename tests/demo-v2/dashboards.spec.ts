import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, userId: string, route: string) {
  const response = await page.request.post("/api/auth/login", { data: { userId } });
  expect(response.ok()).toBeTruthy();
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 120000 });
}

const kpis = (page: Page) => page.getByRole("region", { name: "Portfolio key performance indicators" });

test("demo-v2 reads exact SQL-view values and keeps unavailable metrics empty", async ({ page }) => {
  await login(page, "USR-RO-001", "/ro/dashboard");
  await expect(page.getByRole("heading", { name: "My Performance" })).toBeVisible();
  await expect(page.getByText("Demo Lagos RO 01", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-10-10");
  await expect(kpis(page)).toContainText("₦418.1M");
  await expect(kpis(page)).toContainText("69.68%");
  await expect(kpis(page)).toContainText("Pending");
  await expect(page.locator("footer")).toContainText("synthetic-demo-v2.1");

  await page.goto("/ro/dashboard?productCode=PROD-FIXED", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/productCode=PROD-FIXED/, { timeout: 45000 });
  await expect(kpis(page)).toContainText("₦112M");
  await expect(kpis(page)).toContainText("Product target allocation pending definition");

  await page.goto("/ro/dashboard?productCode=PROD-FIXED&asOfDate=2026-10-31", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/asOfDate=2026-10-31/, { timeout: 45000 });
  await expect(page.getByRole("heading", { name: "No data for this selection" })).toBeVisible();
  await expect(kpis(page)).toHaveCount(0);
});

test("RO and regional scopes are revalidated server-side", async ({ page }) => {
  await login(page, "USR-RO-001", "/ro/dashboard?roId=RO-LAG-02");
  await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible({ timeout: 45000 });
  await expect(page.locator("[data-dashboard-scope]")).toHaveCount(0);

  await login(page, "USR-RM-001", "/regional/dashboard");
  await expect(kpis(page)).toContainText("₦1.9B");
  const table = page.getByRole("table", { name: /Authorized RO performance/ });
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(table).toContainText("Demo Lagos RO 01");
  await expect(table).not.toContainText("Demo Abuja");
  await page.goto("/regional/dashboard?regionId=ABJ", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible({ timeout: 45000 });
  await page.goto("/regional/relationship-officers/RO-ABJ-01", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible({ timeout: 45000 });
});

test("filters preserve URL state and disabled Superset cannot issue a demo-v2 token", async ({ page }) => {
  await login(page, "USR-RM-001", "/regional/dashboard?periodMode=YTD&asOfDate=2026-09-30&productCode=PROD-TREASURY");
  await expect(page.getByRole("button", { name: "YTD", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox", { name: "Product", exact: true })).toHaveValue("PROD-TREASURY");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-09-30");
  const canonical = await page.locator("[data-dashboard-scope]").getAttribute("data-dashboard-scope");
  for (const value of await page.locator("[data-filter-scope]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-filter-scope")))) {
    expect(value).toBe(canonical);
  }
  const regionalKpis = await kpis(page).innerText();
  await page.getByRole("combobox", { name: "Role View", exact: true }).selectOption("investment-breakdown");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator("[data-dashboard-scope]")).toHaveAttribute("data-role-view", "investment-breakdown");
  expect(await kpis(page).innerText()).toBe(regionalKpis);
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toBeDisabled();

  const response = await page.request.post("/api/superset/guest-token", {
    data: {
      dashboardKey: "regional_overview:movement",
      filters: { regionId: "LAG", roId: "ALL", asOfDate: "2026-09-30", productCode: "PROD-TREASURY", periodMode: "YTD" },
    },
    headers: { Origin: "http://127.0.0.1:3200" },
  });
  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: "Analytics is unavailable. Check the local Superset service and retry." });
});
