import { test, expect, type Page } from "@playwright/test";
import fixtures from "../../src/mocks/dashboard-snapshots.json";

async function login(page: Page, userId: string, route?: string) {
  // Retry one stale keep-alive socket reset only; HTTP/application failures are never retried.
  const response = await page.request.post("/api/auth/login", { data: { userId }, maxRetries: 1 });
  expect(response.ok()).toBeTruthy();
  await page.goto(route || (userId.includes("RM") ? "/regional/dashboard" : "/ro/dashboard"));
}
const kpis = (page: Page) => page.getByRole("region", { name: "Portfolio key performance indicators" });
// A section with an accessible label has the region role.
test("precomputed fixtures reconcile and include full YTD history", () => {
  for (const row of fixtures) {
    const m = row.movement;
    expect(Math.abs(Number(m.openingPosition) + Number(m.externalInflows) - Number(m.outflowsLiquidations) - Number(m.closingPosition))).toBeLessThanOrEqual(.021);
    expect(Number(m.closingPosition)).toBe(Number(row.kpi.portfolioBalance));
    for (const period of ["MTD", "YTD"] as const) {
      const total = row.mix[period].reduce((sum, p) => sum + Number(p.allocatedAmount), 0);
      expect(Math.abs(total - Number(row.mix[period][0].denominatorAmount))).toBeLessThanOrEqual(.021);
      expect(Math.abs(row.mix[period].reduce((sum, p) => sum + Number(p.percentageShare), 0) - 100)).toBeLessThanOrEqual(.011);
    }
    if (row.date === "2026-09-30") {
      const months = fixtures.filter(r => r.roIds.join() === row.roIds.join() && r.productCode === row.productCode && r.date.endsWith("15") === false && r.date <= row.date);
      expect(months).toHaveLength(9);
      expect(Math.abs(months.reduce((sum, r) => sum + Number(r.kpi.mtdInflow), 0) - Number(row.kpi.ytdInflow))).toBeLessThanOrEqual(.03);
    }
    if (row.roIds.length === 2) {
      const individual = row.roIds.map(id => fixtures.find(r => r.roIds.length === 1 && r.roIds[0] === id && r.productCode === row.productCode && r.date === row.date)!);
      expect(Math.abs(individual.reduce((sum, r) => sum + Number(r.kpi.portfolioBalance), 0) - Number(row.kpi.portfolioBalance))).toBeLessThanOrEqual(.021);
    }
  }
  expect(fixtures.find(r => r.roIds.join() === "RO-001,RO-002" && r.date === "2026-09-30" && r.productCode === "PROD-ALL")?.kpi.portfolioBalance).toBe("1110000000.00");
});

test("anonymous, forged cookies, role and scope tampering disclose no dashboard", async ({ page, context }) => {
  await page.goto("/regional/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await context.addCookies([{ name: "pis_session", value: "USR-RM-001", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/regional/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "USR-RO-002");
  await expect(kpis(page)).toContainText("₦310M");
  for (const path of ["/ro/dashboard?roId=RO-001", "/ro/dashboard?regionId=REG-02", "/regional/dashboard", "/regional/relationship-officers/RO-001"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible();
    await expect(page.locator("[data-dashboard-scope]")).toHaveCount(0);
  }
  await login(page, "USR-RM-001");
  for (const path of ["/regional/dashboard?regionId=REG-02", "/regional/dashboard?roId=RO-003", "/regional/relationship-officers/RO-003", "/regional/relationship-officers/UNKNOWN", "/regional/relationship-officers/ALL", "/regional/relationship-officers/RO-001?roId=RO-002"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "403 — Access Restricted" })).toBeVisible();
    await expect(page.locator("[data-dashboard-scope]")).toHaveCount(0);
  }
});

test("RO filters, period toggle, history, date and product stay in sync", async ({ page }) => {
  await login(page, "USR-RO-001");
  await expect(kpis(page)).toContainText("₦800M");
  await expect(page.getByRole("combobox", { name: "Region", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Relationship Officer", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "YTD", exact: true }).last().click();
  await expect(page).toHaveURL(/periodMode=YTD/);
  await expect(page.getByRole("heading", { name: "Year-to-date performance" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Monthly movement reconciliation" }).locator("tbody tr")).toHaveCount(9);
  await page.getByRole("combobox", { name: "Product", exact: true }).selectOption("PROD-FIXED");
  await page.getByLabel("Date", { exact: true }).fill("2026-08-31");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/productCode=PROD-FIXED/);
  await expect(kpis(page)).not.toContainText("₦800M");
  await expect(page.locator('[data-chart-key="investment_mix"]')).toContainText("100.00%");
  await expect(page.getByRole("table", { name: "Monthly movement reconciliation" }).locator("tbody tr")).toHaveCount(8);
  const canonical = await page.locator("[data-dashboard-scope]").getAttribute("data-dashboard-scope");
  for (const scope of await page.locator("[data-filter-scope]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-filter-scope")))) expect(scope).toBe(canonical);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Product", exact: true })).toHaveValue("PROD-FIXED");
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Product", exact: true })).toHaveValue("PROD-ALL");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(kpis(page)).toContainText("₦800M");
  await expect(page.getByRole("button", { name: "MTD", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Date", { exact: true }).fill("2026-09-15");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Partial month · Provisional MTD snapshot")).toBeVisible();
  await expect(kpis(page)).toContainText("₦755M");
});

test("regional aggregation, officer filter, search, sort and drill-down preserve scope", async ({ page }) => {
  await login(page, "USR-RM-001");
  await expect(kpis(page)).toContainText("₦1.1B");
  await expect(kpis(page)).toContainText("65.29%");
  const table = page.getByRole("table", { name: /Authorized RO performance/ });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Search officers or branches").fill("ikeja");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search officers or branches").fill("");
  await table.getByRole("button", { name: "Closing position" }).click();
  await expect(table.locator("tbody tr").first()).toContainText("Chioma Okonkwo");
  await page.getByLabel("Date", { exact: true }).fill("2026-08-31");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/asOfDate=2026-08-31/);
  const drilldown = page.getByRole("link", { name: "Chioma Okonkwo", exact: true });
  await expect(drilldown).toHaveCount(1);
  await expect(drilldown).toHaveAttribute("href", /asOfDate=2026-08-31/);
  await drilldown.click();
  await expect(page).toHaveURL(/relationship-officers\/RO-002\?.*asOfDate=2026-08-31/);
  await expect(kpis(page)).toContainText("₦270M");
  await page.getByRole("link", { name: "Back to all ROs" }).click();
  await expect(page).toHaveURL(/regional\/dashboard\?.*roId=ALL/);
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-08-31");
  await page.getByRole("combobox", { name: "Relationship Officer", exact: true }).selectOption("RO-002");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(kpis(page)).toContainText("₦270M");
  await login(page, "USR-RM-002");
  await expect(kpis(page)).toContainText("₦470M");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table).toContainText("Emeka Nwosu");
  await expect(page.getByRole("combobox", { name: "Relationship Officer", exact: true }).locator("option")).toHaveCount(2);
  await expect(page.getByRole("combobox", { name: "Region", exact: true }).locator("option")).toHaveCount(1);
});

test("empty, invalid-filter and logout states are honest", async ({ page }) => {
  await login(page, "USR-RO-001", "/ro/dashboard?productCode=PROD-CALL");
  await expect(page.getByRole("heading", { name: "No data for this selection" })).toBeVisible();
  await expect(kpis(page)).toHaveCount(0);
  await page.goto("/ro/dashboard?asOfDate=2025-12-31");
  await expect(page.getByRole("heading", { name: "No data for this selection" })).toBeVisible();
  for (const query of ["asOfDate=2026-02-30", "productCode=bad", "periodMode=bad", "roId=RO-001&roId=RO-002"]) {
    await page.goto(`/ro/dashboard?${query}`);
    await expect(page.getByRole("heading", { name: "Invalid dashboard filters" })).toBeVisible();
  }
  await page.getByRole("link", { name: "Reset dashboard filters" }).click();
  await expect(kpis(page)).toContainText("₦800M");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/ro/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
  for (const role of ["ro", "regional"]) {
    test(`${role} ${viewport.name} responsive screenshot and controls`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize(viewport);
      await login(page, role === "ro" ? "USR-RO-001" : "USR-RM-001");
      await expect(page.getByRole("heading", { name: role === "ro" ? "My Performance" : "Regional RO Performance", exact: true })).toBeVisible();
      await expect(page.locator("body")).toContainText("Demo / Synthetic Data");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      for (const label of ["Region", "Relationship Officer", "Date", "Product"]) {
        const box = await (label === "Date" ? page.getByLabel(label, { exact: true }) : page.getByRole("combobox", { name: label, exact: true })).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.width).toBeGreaterThan(90);
      }
      const filterBox = await page.getByRole("form", { name: "Global filters" }).boundingBox();
      const kpiBox = await kpis(page).boundingBox();
      expect(filterBox!.y + filterBox!.height).toBeLessThan(kpiBox!.y);
      if (viewport.width < 1024) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(page.getByRole("dialog", { name: "Main navigation" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
      }
      await page.screenshot({ path: `doc/qa/phase2/${role}-${viewport.name}.png`, fullPage: true });
      expect(errors).toEqual([]);
      await expect(page.getByRole("columnheader", { name: /^status$/i })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /account opening|daily performance|product performance|recent activit/i })).toHaveCount(0);
    });
  }
}

test("intermediate and narrow widths contain controls and tables", async ({ page }) => {
  for (const user of ["USR-RO-001", "USR-RM-001"]) {
    await login(page, user);
    for (const width of [1280, 1024, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const apply = await page.getByRole("button", { name: "Apply", exact: true }).boundingBox();
      expect(apply!.x + apply!.width).toBeLessThanOrEqual(width);
      if (width === 320 && user.includes("RM")) {
        const region = page.getByRole("region", { name: "Officer comparison table; scroll horizontally for more columns" });
        await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        const firstCell = await region.locator("tbody tr td").first().boundingBox();
        const container = await region.boundingBox();
        expect(Math.abs(firstCell!.x - container!.x)).toBeLessThan(2);
      }
    }
  }
});

test("authenticated responses are private and edited signed cookies are rejected", async ({ page, context }) => {
  await login(page, "USR-RO-001");
  const response = await page.request.get("/ro/dashboard");
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const cookie = (await context.cookies()).find(c => c.name === "pis_session")!;
  expect(cookie.httpOnly).toBeTruthy();
  expect(cookie.secure).toBeTruthy();
  const altered = cookie.value.slice(0, -1) + (cookie.value.endsWith("a") ? "b" : "a");
  await context.addCookies([{ ...cookie, value: altered }]);
  await page.goto("/ro/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
