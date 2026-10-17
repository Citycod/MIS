import { expect, test } from "@playwright/test";
import { normalizeRoleView } from "../../src/lib/filters";
import { getAssignedPrimaryRegion } from "../../src/lib/server/security/primary-region";
import { MOCK_USERS } from "../../src/mocks/fixtures";
import { csrfPost, loginAs } from "../helpers/auth";

test("legacy Role View values stay presentation-only and unknown values fail safely", () => {
  for (const value of ["CFO", "ADMIN", "REGIONAL_MANAGER", "__proto__", undefined]) {
    expect(normalizeRoleView(value)).toBe("portfolio-overview");
  }
});

test("ambiguous regional assignment fails closed without an explicit primary region", () => {
  const manager = { ...MOCK_USERS["USR-RM-001"], allowedRegionIds: ["REG-01", "REG-02"] };
  expect(getAssignedPrimaryRegion(manager)).toBe("REG-01");
  expect(getAssignedPrimaryRegion({ ...manager, regionId: "" })).toBeNull();
  expect(getAssignedPrimaryRegion({ ...manager, regionId: "UNKNOWN" })).toBeNull();
});

test("forged filters and CSV dashboard resources cannot expand an RO scope", async ({ page }) => {
  await loginAs(page, "USR-RO-001");
  for (const filters of [
    { regionId: "REG-02", roId: "RO-001" },
    { regionId: "REG-01", roId: "RO-002" },
  ]) {
    const response = await csrfPost(page, "/api/superset/guest-token", {
      data: { dashboardKey: "csv_monthly_performance_review", filters: { ...filters, startDate: "2026-01-01", asOfDate: "2026-09-30", productCode: "PROD-ALL", periodMode: "YTD" } },
    });
    expect(response.status()).toBe(403);
  }
});
