import { expect, test, type Page } from "@playwright/test";
import fixtures from "../../src/mocks/dashboard-snapshots.json";

async function login(page: Page, userId: string, route?: string) {
  const response = await page.request.post("/api/auth/login", { data: { userId }, maxRetries: 1 });
  expect(response.ok()).toBeTruthy();
  await page.goto(route || (userId.includes("RM") ? "/regional/dashboard" : "/ro/dashboard"));
}

async function expectSupersetCharts(page: Page) {
  const iframe = page.locator("iframe[title$='— synthetic data']");
  await expect(iframe).toBeVisible({ timeout: 60_000 });
  const frame = iframe.contentFrame();
  await expect(frame.locator("canvas").first()).toBeVisible({ timeout: 60_000 });
  await expect(frame.locator(".ant-alert-error")).toHaveCount(0);
}

test("precomputed Phase 2 fixtures still reconcile", () => {
  for (const row of fixtures) {
    expect(Math.abs(Number(row.movement.openingPosition) + Number(row.movement.externalInflows) - Number(row.movement.outflowsLiquidations) - Number(row.movement.closingPosition))).toBeLessThanOrEqual(.021);
    expect(Number(row.movement.closingPosition)).toBe(Number(row.kpi.portfolioBalance));
    for (const period of ["MTD", "YTD"] as const) {
      const total = row.mix[period].reduce((sum, item) => sum + Number(item.allocatedAmount), 0);
      expect(Math.abs(total - Number(row.mix[period][0].denominatorAmount))).toBeLessThanOrEqual(.021);
    }
  }
});

test("anonymous and cross-scope dashboard requests fail closed", async ({ page, context }) => {
  await page.goto("/ro/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await context.addCookies([{ name: "pis_session", value: "USR-RO-001", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/ro/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "USR-RO-001");
  for (const route of ["/ro/dashboard?roId=RO-002", "/ro/dashboard?regionId=REG-02", "/regional/dashboard"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible();
    await expect(page.locator("[data-dashboard-scope]")).toHaveCount(0);
  }
  await login(page, "USR-RM-001");
  for (const route of ["/regional/dashboard?regionId=REG-02", "/regional/dashboard?roId=RO-003"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible();
  }
});

test("reference dashboard shell, filters and navigation are functional", async ({ page }) => {
  await login(page, "USR-RO-001");
  await expect(page.getByRole("heading", { name: "Management Information System" })).toBeVisible();
  await expect(page.getByText("Monthly Performance Review", { exact: true })).toHaveCount(0);
  await expect(page.getByText("YTD", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Dashboard filters" })).toBeVisible();
  await expect(page.getByLabel("Region", { exact: true })).toBeDisabled();
  const relationshipOfficer = page.getByRole("combobox", { name: "Relationship Officer", exact: true });
  await expect(relationshipOfficer).toBeDisabled();
  await expect(relationshipOfficer).toHaveValue("RO-001");
  await expect(relationshipOfficer.locator("option:checked")).toHaveText("My Portfolio");
  await expect(page.getByLabel("Start Date", { exact: true })).toHaveValue("2026-01-01");
  await expect(page.getByLabel("End Date", { exact: true })).toHaveValue("2026-09-30");
  await expect(page.getByRole("region", { name: "Apache Superset performance dashboard" })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  for (const item of ["Dashboard", "Customer Records", "Concentration Risk", "Profitability"]) {
    await expect(navigation.getByRole("link", { name: item, exact: true })).toBeVisible();
  }
  await page.getByLabel("Start Date", { exact: true }).fill("2026-02-01");
  await page.getByLabel("End Date", { exact: true }).fill("2026-08-31");
  await page.getByRole("combobox", { name: "Product", exact: true }).selectOption("PROD-SHYTA");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/startDate=2026-02-01/);
  await expect(page).toHaveURL(/asOfDate=2026-08-31/);
  await expect(page).toHaveURL(/productCode=PROD-SHYTA/);
  await page.reload();
  await expect(page.getByLabel("Start Date", { exact: true })).toHaveValue("2026-02-01");
  await expect(page.getByRole("combobox", { name: "Product", exact: true })).toHaveValue("PROD-SHYTA");
});

test("regional manager remains locked to the assigned region and can select authorized ROs", async ({ page }) => {
  await login(page, "USR-RM-001");
  await expect(page.getByLabel("Region", { exact: true })).toBeDisabled();
  const relationshipOfficer = page.getByRole("combobox", { name: "Relationship Officer", exact: true });
  await expect(relationshipOfficer).toBeEnabled();
  await expect(relationshipOfficer.locator("option")).toHaveCount(3);
  await relationshipOfficer.selectOption("RO-002");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/roId=RO-002/);
  await relationshipOfficer.selectOption("ALL");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/roId=ALL/);
});

test("CSV template and authorized synthetic upload switch to the isolated Superset dashboard", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page, "USR-RO-001");
  const template = await page.request.get("/api/csv-import");
  expect(template.status()).toBe(200);
  expect(template.headers()["content-type"]).toContain("text/csv");
  expect(await template.text()).toContain("annual_target_ngn,funds_mobilized_ngn,target_completion_pct");

  await page.getByRole("button", { name: "Import CSV" }).click();
  await expect(page.getByRole("dialog", { name: "Import synthetic CSV data" })).toBeVisible();
  const csv = [
    "reporting_date,region_id,region_name,ro_id,ro_name,product,annual_target_ngn,funds_mobilized_ngn,target_completion_pct",
    "2026-01-31,REG-01,Lagos Region,RO-001,Adebayo Adeyemi,SESA without TAX,1200000000,50000000,",
    "2026-02-28,REG-01,Lagos Region,RO-001,Adebayo Adeyemi,SHYTA,1200000000,85000000,",
  ].join("\n");
  await page.getByLabel("CSV file").setInputFiles({ name: "synthetic-performance.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Import and refresh" }).click();
  await expect(page).toHaveURL(/source=csv/);
  await expect(page.locator("[data-dashboard-source]")).toHaveAttribute("data-dashboard-source", "csv");
  await expect(page.getByText("Imported CSV · Synthetic Data")).toBeVisible();
  await expectSupersetCharts(page);

  const denied = csv.replaceAll("RO-001", "RO-002").replaceAll("Adebayo Adeyemi", "Chioma Okonkwo");
  const response = await page.request.post("/api/csv-import", {
    multipart: { file: { name: "unauthorized.csv", mimeType: "text/csv", buffer: Buffer.from(denied) } },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("outside your authorized scope");
});

test("the legacy RO portfolio path preserves query parameters", async ({ page }) => {
  await login(page, "USR-RO-001");
  await page.goto("/ro/portfolio?asOfDate=2026-08-31&productCode=PROD-SHYTA");
  await expect(page).toHaveURL(/\/ro\/investments\?asOfDate=2026-08-31&productCode=PROD-SHYTA$/);
});

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`RO dashboard matches the responsive shell at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await login(page, "USR-RO-001");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const form = page.getByRole("form", { name: "Dashboard filters" });
    for (const control of await form.locator("select, input, button").all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    if (viewport.width < 1024) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("dialog", { name: "Main navigation" })).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Main navigation" }).getByText("Customer Records", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    }
    await expectSupersetCharts(page);
    await page.screenshot({ path: `doc/qa/samtl-dashboard/ro-${viewport.name}.png`, fullPage: true });
  });
}

test("authenticated dashboard responses remain private and logout clears access", async ({ page }) => {
  await login(page, "USR-RO-001");
  const response = await page.request.get("/ro/dashboard");
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
