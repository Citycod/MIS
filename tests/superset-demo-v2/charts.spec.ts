import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(".local/superset/demo-v2-registry.json", "utf8"));
const defaultFilters = { regionId: "LAG", roId: "RO-LAG-01", asOfDate: "2026-10-10", productCode: "PROD-ALL", periodMode: "MTD" };

async function login(page: Page, userId: string, route: string) {
  expect((await page.request.post("/api/auth/login", { data: { userId } })).ok()).toBeTruthy();
  await page.goto(route, { waitUntil: "domcontentloaded" });
}

async function token(page: Page, key: string, filters = defaultFilters) {
  const response = await page.request.post("/api/superset/guest-token", { data: { dashboardKey: key, filters } });
  expect(response.status(), await response.text()).toBe(200);
  return response.json() as Promise<{ token: string; dashboardId: string; supersetDomain: string }>;
}
function guestClaims(value: string) {
  return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8")) as { resources: unknown; rls: unknown };
}

async function chartQuery(page: Page, key: string, guest: { token: string }, tamper?: (body: { queries: { filters: unknown[]; extras: { where: string; having: string } }[] }) => void) {
  const entry = registry.dashboards[key];
  const headers = { "X-GuestToken": guest.token };
  const isComparison = key === "regional_overview:ro_position_target";
  const isMix = key === "investment_mix";
  const isPosition = key.endsWith(":position");
  const dimension = isComparison ? "ro_name" : isMix ? "product" : "reporting_month";
  const metrics = isMix ? ["Eligible investment"] : isComparison ? ["Closing position", "Annual target"] : isPosition ? ["Closing position", "Annual target reference"] : ["External inflows", "Withdrawals", "Net movement"];
  const body = {
    datasource: { id: entry.datasetId, type: "table" },
    queries: [{
      columns: [dimension], metrics,
      filters: [], row_limit: 100, is_timeseries: false,
      extras: { where: "", having: "" },
    }],
    result_format: "json", result_type: "full", force: false,
    form_data: {
      datasource: `${entry.datasetId}__table`, slice_id: entry.chartId,
      dashboardId: entry.dashboardId, viz_type: isMix ? "pie" : isComparison ? "dist_bar" : isPosition ? "echarts_timeseries_line" : "echarts_timeseries_bar",
    },
  };
  tamper?.(body);
  return page.request.post(`${registry.domain}/api/v1/chart/data`, { headers, data: body });
}

async function rows(page: Page, key: string, filters = defaultFilters) {
  const response = await chartQuery(page, key, await token(page, key, filters));
  expect(response.status(), await response.text()).toBe(200);
  const result = await response.json();
  expect(result.result[0].status).toBe("success");
  return result.result[0].data as Record<string, string | number | null>[];
}

async function rendered(page: Page, count: number) {
  await expect(page.locator("iframe[title$='— synthetic data']")).toHaveCount(count);
  if (process.env.MIS_SUPERSET_DEBUG === "true") {
    page.on("console", message => console.log(`[browser:${message.type()}] ${message.text()}`));
    page.on("pageerror", error => console.log(`[browser-error] ${error.message}`));
    page.on("response", response => {
      if (response.url().includes("127.0.0.1:8088")) console.log(`[superset:${response.status()}] ${response.url()}`);
    });
  }
  for (let index = 0; index < count; index += 1) {
    const frame = page.locator("iframe[title$='— synthetic data']").nth(index).contentFrame();
    if (process.env.MIS_SUPERSET_DEBUG === "true") {
      await frame.locator("body").waitFor({ state: "attached" });
      console.log(`[frame-${index}] ${((await frame.locator("body").innerText()).replaceAll("\n", " ").slice(0, 1000))}`);
    }
    await expect(frame.locator("canvas").first()).toBeVisible();
    await expect(frame.locator(".ant-alert-error")).toHaveCount(0);
  }
}

test("guest tokens bind each demo-v2 reporting filter and reject unauthorized resources", async ({ page }) => {
  expect((await page.request.post("/api/superset/guest-token", { data: {} })).status()).toBe(401);
  await login(page, "USR-RO-001", "/ro/dashboard");
  expect((await page.request.post("/api/superset/guest-token", { data: { dashboardKey: "ro_overview:movement", filters: { ...defaultFilters, roId: "RO-LAG-02" } } })).status()).toBe(403);
  expect((await page.request.post("/api/superset/guest-token", { data: { dashboardKey: "regional_overview:movement", filters: defaultFilters } })).status()).toBe(403);
  const guest = await token(page, "ro_overview:movement");
  const lensGuest = await token(page, "ro_overview:movement", { ...defaultFilters, roleView: "investment-breakdown" } as typeof defaultFilters);
  const unknownLensGuest = await token(page, "ro_overview:movement", { ...defaultFilters, roleView: "CFO" } as typeof defaultFilters);
  expect(guestClaims(lensGuest.token).rls).toEqual(guestClaims(guest.token).rls);
  expect(guestClaims(lensGuest.token).resources).toEqual(guestClaims(guest.token).resources);
  expect(guestClaims(unknownLensGuest.token).rls).toEqual(guestClaims(guest.token).rls);
  const other = registry.dashboards["regional_overview:movement"];
  expect((await page.request.get(`${registry.domain}/api/v1/dashboard/${other.dashboardId}`, { headers: { "X-GuestToken": guest.token } })).status()).toBe(403);
});

test("RLS holds against tampered chart queries and reflects MTD, YTD, product and no-data dates", async ({ page }) => {
  await login(page, "USR-RO-001", "/ro/dashboard");
  const mtd = await rows(page, "ro_overview:movement");
  expect(mtd).toHaveLength(1);
  expect(mtd[0].reporting_month).toBe("2026-10-01");
  const ytd = await rows(page, "ro_overview:movement", { ...defaultFilters, asOfDate: "2026-09-30", periodMode: "YTD" });
  expect(ytd).toHaveLength(9);
  const product = await rows(page, "ro_overview:movement", { ...defaultFilters, productCode: "PROD-FIXED" });
  expect(product).toHaveLength(1);
  const noData = await rows(page, "ro_overview:movement", { ...defaultFilters, asOfDate: "2026-10-31" });
  expect(noData).toEqual([]);
  const guest = await token(page, "ro_overview:movement");
  const tampered = await chartQuery(page, "ro_overview:movement", guest, body => {
    body.queries[0].filters = [];
    body.queries[0].extras = { where: "1=1", having: "" };
  });
  expect(tampered.status()).toBe(200);
  const data = (await tampered.json()).result[0].data as Record<string, string>[];
  expect(data).toHaveLength(1);
  expect(data[0].reporting_month).toBe("2026-10-01");
  const crossRegion = await chartQuery(page, "ro_overview:movement", guest, body => {
    body.queries[0].extras = { where: "region_id = 'ABJ'", having: "" };
  });
  expect(crossRegion.status()).toBe(200);
  expect((await crossRegion.json()).result[0].data).toEqual([]);
});

test("RO and regional pages render separate Superset dashboards at desktop, tablet and mobile sizes", async ({ page }) => {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await login(page, "USR-RO-001", "/ro/dashboard?periodMode=YTD");
    await rendered(page, 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `doc/qa/superset-demo-v2/ro-${viewport.name}.png`, fullPage: true });
    await login(page, "USR-RM-001", "/regional/dashboard?periodMode=YTD&roId=ALL");
    await rendered(page, 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `doc/qa/superset-demo-v2/regional-${viewport.name}.png`, fullPage: true });
  }
});

test("regional RLS retains only the authorized officers", async ({ page }) => {
  await login(page, "USR-RM-001", "/regional/dashboard");
  const rowsForLag = await rows(page, "regional_overview:ro_position_target", { ...defaultFilters, roId: "ALL" });
  expect(rowsForLag).toHaveLength(4);
  expect(rowsForLag.every(row => String(row.ro_name).includes("Lagos"))).toBeTruthy();
  const forbidden = await page.request.post("/api/superset/guest-token", { data: { dashboardKey: "regional_overview:movement", filters: { ...defaultFilters, regionId: "ABJ", roId: "ALL" } } });
  expect(forbidden.status()).toBe(403);
});

// Phase B regression; execution deferred at the user's request.
test("Role View leaves signed authorization claims and chart records unchanged", async ({ page }) => {
  await login(page, "USR-RO-001", "/ro/dashboard");
  const key = "ro_overview:movement";
  const baseline = await token(page, key);
  const claims = (value: string) => {
    const payload = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString());
    return { user: payload.user, resources: payload.resources, rls_rules: payload.rls_rules };
  };
  const originalRows = await rows(page, key, defaultFilters);
  for (const roleView of ["portfolio-overview", "investment-breakdown", "monthly-movement", "CFO", "__proto__"]) {
    const filters = { ...defaultFilters, roleView };
    const guest = await token(page, key, filters);
    expect(claims(guest.token)).toEqual(claims(baseline.token));
    expect(await rows(page, key, filters)).toEqual(originalRows);
  }
});
