import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import fixtures from "../../src/mocks/dashboard-snapshots.json";
import { csrfPost, loginAs } from "../helpers/auth";
const registry = JSON.parse(readFileSync(".local/superset/registry.json", "utf8"));
const defaultFilters = { regionId: "REG-01", roId: "RO-001", asOfDate: "2026-09-30", productCode: "PROD-ALL", periodMode: "MTD" };
async function login(page: Page, userId: string, query = "") {
  await loginAs(page, userId);
  await page.goto(`${userId.includes("RM") ? "/regional/dashboard" : "/ro/dashboard"}${query}`);
}
async function token(page: Page, key: string, filters = defaultFilters) {
  const response = await csrfPost(page, "/api/superset/guest-token", { data: { dashboardKey: key, filters } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json();
}
function guestClaims(value: string) {
  return JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8")) as { resources: unknown; rls: unknown };
}
async function chartQuery(page: Page, key: string, guest: { token: string }, tamper?: (body: { queries: { filters: { col: string; op: string; val: string }[]; extras: { where: string; having: string } }[] }) => void) {
  const entry = registry.dashboards[key];
  const headers = { "X-GuestToken": guest.token };
  const chart = await page.request.get(`${registry.domain}/api/v1/chart/${entry.chartId}`, { headers });
  expect(chart.status()).toBe(200);
  const { result } = await chart.json();
  const body = JSON.parse(result.query_context);
  body.form_data = { ...JSON.parse(result.params), dashboardId: entry.dashboardId };
  body.force = false;
  tamper?.(body);
  return page.request.post(`${registry.domain}/api/v1/chart/data`, { headers, data: body });
}
async function rows(page: Page, key: string, filters: typeof defaultFilters) {
  const response = await chartQuery(page, key, await token(page, key, filters));
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body.result[0].status).toBe("success");
  return body.result[0].data as Record<string, number | string | null>[];
}
async function rendered(page: Page, count: number) {
  await expect(page.locator("iframe[title$='— synthetic data']")).toHaveCount(count);
  for (let i = 0; i < count; i++) {
    const iframe = page.locator("iframe[title$='— synthetic data']").nth(i);
    const frame = iframe.contentFrame();
    await expect(frame.locator("canvas").first()).toBeVisible();
    await expect(frame.locator(".ant-alert-error")).toHaveCount(0);
    const box = await iframe.boundingBox();
    expect(box!.width).toBeGreaterThan(220);
    const canvas = await frame.locator("canvas").first().boundingBox();
    expect(canvas!.width).toBeGreaterThan(150);
    expect(canvas!.height).toBeGreaterThan(100);
  }
}

test("broker rejects anonymous access, malformed filters and unauthorized scopes", async ({ page }) => {
  expect((await csrfPost(page, "/api/superset/guest-token", { data: {} })).status()).toBe(401);
  await login(page, "USR-RO-001");
  for (const filters of [{ ...defaultFilters, roId: "RO-002" }, { ...defaultFilters, regionId: "REG-02" }]) {
    expect((await csrfPost(page, "/api/superset/guest-token", { data: { dashboardKey: "investment_mix", filters } })).status()).toBe(403);
  }
  for (const key of ["regional_overview:movement", "unknown", "__proto__"]) {
    expect((await csrfPost(page, "/api/superset/guest-token", { data: { dashboardKey: key, filters: defaultFilters } })).status()).toBe(403);
  }
  for (const filters of [{ ...defaultFilters, periodMode: "ALL" }, { ...defaultFilters, roId: ["RO-001"] }, { ...defaultFilters, productCode: "x' OR 1=1 --" }]) {
    expect((await csrfPost(page, "/api/superset/guest-token", { data: { dashboardKey: "investment_mix", filters } })).status()).toBe(400);
  }
  expect((await csrfPost(page, "/api/superset/guest-token", { headers: { Origin: "https://untrusted.invalid" }, data: { dashboardKey: "investment_mix", filters: defaultFilters } })).status()).toBe(403);
});

test("Superset guest queries reconcile with RO fixtures across date, product and MTD/YTD", async ({ page }) => {
  await login(page, "USR-RO-001");
  for (const f of [defaultFilters, { ...defaultFilters, periodMode: "YTD" }, { ...defaultFilters, asOfDate: "2026-08-31", productCode: "PROD-FIXED", periodMode: "YTD" }, { ...defaultFilters, asOfDate: "2026-09-15" }]) {
    const snapshot = fixtures.find(s => s.roIds.join() === f.roId && s.date === f.asOfDate && s.productCode === f.productCode)!;
    const movement = await rows(page, "ro_overview:movement", f);
    expect(movement).toHaveLength(f.periodMode === "YTD" ? Number(f.asOfDate.slice(5, 7)) : 1);
    const last = movement.find(r => r.month === f.asOfDate.slice(0, 7))!;
    expect(last["Net movement"]).toBe(Number(snapshot.kpi.monthlyNetMovement));
    expect(last.Withdrawals).toBe(-Number(snapshot.kpi.mtdOutflow));
    const position = await rows(page, "ro_overview:position", f);
    expect(position.find(r => r.month === f.asOfDate.slice(0, 7))!["Closing position"]).toBe(Number(snapshot.kpi.portfolioBalance));
    const mix = await rows(page, "investment_mix", f);
    expect(mix).toHaveLength(snapshot.mix[f.periodMode as "MTD" | "YTD"].length);
    for (const item of snapshot.mix[f.periodMode as "MTD" | "YTD"]) expect(mix.find(r => r.product_name === item.productName)!["Eligible investment"]).toBe(Number(item.allocatedAmount));
  }
});

test("Superset enforces RLS under query tampering, token edits and resource substitution", async ({ page }) => {
  await login(page, "USR-RO-001");
  const key = "ro_overview:movement";
  const guest = await token(page, key);
  const lensGuest = await token(page, key, { ...defaultFilters, roleView: "monthly-movement" } as typeof defaultFilters);
  const unknownLensGuest = await token(page, key, { ...defaultFilters, roleView: "CFO" } as typeof defaultFilters);
  expect(guestClaims(lensGuest.token).rls).toEqual(guestClaims(guest.token).rls);
  expect(guestClaims(lensGuest.token).resources).toEqual(guestClaims(guest.token).resources);
  expect(guestClaims(unknownLensGuest.token).rls).toEqual(guestClaims(guest.token).rls);
  const broad = await chartQuery(page, key, guest, body => {
    body.queries[0].filters = [];
    body.queries[0].extras = { where: "1=1", having: "" };
  });
  expect(broad.status()).toBe(200);
  const data = (await broad.json()).result[0].data;
  expect(data).toHaveLength(1);
  expect(data[0]["Net movement"]).toBe(90000000);
  const crossRegion = await chartQuery(page, key, guest, body => { body.queries[0].filters = [{ col: "region_id", op: "==", val: "REG-02" }]; });
  expect(crossRegion.status()).toBe(200);
  expect((await crossRegion.json()).result[0].data).toEqual([]);
  const crossOfficer = await chartQuery(page, key, guest, body => { body.queries[0].filters = [{ col: "scope_key", op: "==", val: "RO-002" }]; });
  expect(crossOfficer.status()).toBe(200);
  expect((await crossOfficer.json()).result[0].data).toEqual([]);
  const other = registry.dashboards["regional_overview:ro_position_target"];
  expect((await page.request.get(`${registry.domain}/api/v1/dashboard/${other.dashboardId}`, { headers: { "X-GuestToken": guest.token } })).status()).toBe(403);
  const changedToken = guest.token.slice(0, -5) + "aaaaa";
  expect((await page.request.get(`${registry.domain}/api/v1/dashboard/${registry.dashboards[key].dashboardId}`, { headers: { "X-GuestToken": changedToken } })).ok()).toBeFalsy();
  expect((await page.request.get(`${registry.domain}/api/v1/dashboard/${registry.dashboards[key].dashboardId}`)).ok()).toBeFalsy();
  expect((await page.request.post(`${registry.domain}/api/v1/sqllab/execute/`, { headers: { "X-GuestToken": guest.token }, data: { sql: "SELECT * FROM fixture_movement", database_id: 1 } })).ok()).toBeFalsy();
});

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 820, height: 1180 }, { name: "mobile", width: 390, height: 844 }]) {
  for (const role of ["ro", "regional"]) {
    test(`${role} ${viewport.name} actual charts and responsive screenshot`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await login(page, role === "ro" ? "USR-RO-001" : "USR-RM-001", "?periodMode=YTD");
      await rendered(page, role === "ro" ? 3 : 4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      for (const frame of await page.locator("iframe").all()) {
        const box = await frame.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      }
      await page.screenshot({ path: `doc/qa/superset/${role}-${viewport.name}.png`, fullPage: true });
    });
  }
}

test("regional filters and drilldown synchronize the rendered chart requests", async ({ page }) => {
  await login(page, "USR-RM-001");
  await rendered(page, 4);
  const regional = { ...defaultFilters, roId: "ALL" };
  expect((await rows(page, "regional_overview:movement", regional))[0]["Net movement"]).toBe(130000000);
  expect(await rows(page, "regional_overview:ro_position_target", regional)).toHaveLength(2);
  await page.getByRole("combobox", { name: "Relationship Officer", exact: true }).selectOption("RO-002");
  await page.getByLabel("Date", { exact: true }).fill("2026-08-31");
  await page.getByRole("combobox", { name: "Product", exact: true }).selectOption("PROD-FIXED");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/roId=RO-002/);
  await rendered(page, 4);
  await page.getByRole("button", { name: "YTD", exact: true }).last().click();
  await expect(page).toHaveURL(/periodMode=YTD/);
  await rendered(page, 4);
  const selected = { ...regional, roId: "RO-002", asOfDate: "2026-08-31", productCode: "PROD-FIXED", periodMode: "YTD" };
  expect(await rows(page, "regional_overview:movement", selected)).toHaveLength(8);
  expect(await rows(page, "regional_overview:ro_position_target", selected)).toHaveLength(1);
  await page.getByRole("link", { name: "Chioma Okonkwo", exact: true }).click();
  await expect(page).toHaveURL(/relationship-officers\/RO-002/);
  await rendered(page, 4);
  await login(page, "USR-RM-002");
  await rendered(page, 4);
  const abuja = { ...regional, regionId: "REG-02" };
  expect((await rows(page, "regional_overview:movement", abuja))[0]["Net movement"]).toBe(70000000);
  const officers = await rows(page, "regional_overview:ro_position_target", abuja);
  expect(officers).toHaveLength(1);
  expect(officers[0].officer).toBe("Emeka Nwosu");
});

// Phase B regression; execution deferred at the user's request.
test("Role View leaves signed authorization claims and chart records unchanged", async ({ page }) => {
  await login(page, "USR-RO-001");
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
