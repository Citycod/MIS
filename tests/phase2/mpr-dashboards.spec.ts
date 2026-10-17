import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { csrfPost, loginAs } from "../helpers/auth";

const artifactDir = path.join(process.cwd(), "doc", "qa", "mpr-dashboards");

async function login(page: Page, userId = "USR-RM-001") {
  await loginAs(page, userId);
}

async function expectDashboard(page: Page, heading: string, chartTitle: string) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  const iframe = page.locator("iframe[title$='— synthetic data']");
  await expect(iframe).toBeVisible({ timeout: 60_000 });
  const frame = iframe.contentFrame();
  await expect(frame.getByText(chartTitle, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  await expect(frame.getByText("Waiting on database…")).toHaveCount(0, { timeout: 90_000 });
  await expect(frame.getByText("Waiting on database...")).toHaveCount(0, { timeout: 90_000 });
  await expect(frame.locator(".ant-alert-error")).toHaveCount(0);
  return frame;
}

test.describe.serial("three MPR dashboard reports", () => {
  test.beforeAll(async () => { await mkdir(artifactDir, { recursive: true }); });

  test("desktop navigation and all Superset reports render", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
    await page.goto("/regional/dashboard");
    await expect(page).toHaveURL(/\/regional\/dashboard\/position-summary/);
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(navigation.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-expanded", "true");
    for (const name of ["RO Profitability Summary", "YTD Account Opening Summary", "RO Position Summary"]) {
      await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(navigation.getByRole("link", { name: "Profitability", exact: true })).toHaveCount(0);

    let frame = await expectDashboard(page, "RO POSITION SUMMARY", "TEAM PERFORMANCE SUMMARY");
    await expect(frame.getByText("New Target vs Balance Sheet", { exact: true }).first()).toBeVisible();
    await expect(frame.getByText("₦1,200,000,000", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: path.join(artifactDir, "ro-position-summary-desktop.png"), fullPage: true });

    const comparisonChart = frame.locator("[data-test='dashboard-component-chart-holder']").filter({ hasText: "New Target vs Balance Sheet" });
    await comparisonChart.getByRole("button", { name: "More Options" }).click();
    await frame.getByText("Enter fullscreen", { exact: true }).click();
    await expect.poll(() => frame.locator("[data-test='dashboard-component-chart-holder']:fullscreen").count()).toBe(1);
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: path.join(artifactDir, "position-chart-fullscreen.png") });
    await page.goto("/regional/dashboard/profitability-summary?source=financial-sample");
    frame = await expectDashboard(page, "RO PROFITABILITY SUMMARY", "RO Profitability Summary Table");
    await expect(frame.getByText("Profitability by RO", { exact: true }).first()).toBeVisible();
    await expect(frame.getByText("0.21", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "ro-profitability-summary-desktop.png"), fullPage: true });

    await page.goto("/regional/dashboard/account-opening-summary?source=financial-sample");
    frame = await expectDashboard(page, "YTD ACCOUNT OPENING SUMMARY", "YTD Account Opening Summary Table");
    await expect(frame.getByText("Current YTD vs Previous YTD", { exact: true }).first()).toBeVisible();
    await expect(frame.getByText("80.3%", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "ytd-account-opening-summary-desktop.png"), fullPage: true });
  });

  test("mobile dashboard submenu remains usable", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/regional/dashboard/position-summary");
    await expectDashboard(page, "RO POSITION SUMMARY", "TEAM PERFORMANCE SUMMARY");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const dialog = page.getByRole("dialog", { name: "Main navigation" });
    await expect(dialog.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-expanded", "true");
    await expect(dialog.getByRole("link", { name: "RO Profitability Summary", exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "YTD Account Opening Summary", exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "RO Position Summary", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "dashboard-submenu-mobile.png"), fullPage: true });
  });

  test("guest-token RLS rejects an unauthorized officer", async ({ page }) => {
    await login(page, "USR-RO-001");
    const response = await csrfPost(page, "/api/superset/guest-token", {
      data: {
        dashboardKey: "financial_sample_mpr_position",
        filters: {
          regionId: "REG-01", roId: "RO-002", startDate: "2026-01-01",
          asOfDate: "2026-10-10", productCode: "PROD-ALL", periodMode: "YTD",
          roleView: "portfolio-overview",
        },
      },
    });
    expect(response.status()).toBe(403);
  });
});
