import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test, type Page } from "@playwright/test";
import { csrfPost, loginAs } from "../helpers/auth";

async function login(page: Page, userId: string, route: string) {
  await loginAs(page, userId);
  await page.goto(route);
}

const exportRequest = {
  teamId: "REG-01",
  cutoff: "2026-10-10",
  reportType: "monthly-performance-review",
  format: "pptx",
};

test.describe.serial("secure Monthly Performance Review export", () => {
  test("rejects anonymous and cross-team export requests", async ({ page }) => {
    expect((await csrfPost(page, "/api/mpr/export", { data: exportRequest })).status()).toBe(401);
    await login(page, "USR-RO-001", "/ro/reports");
    const forbidden = await csrfPost(page, "/api/mpr/export", { data: { ...exportRequest, teamId: "REG-02" } });
    expect(forbidden.status()).toBe(403);
    expect((await forbidden.json()).error).toContain("outside your authorized scope");
  });

  test("RO receives only the scoped deck and cannot import source extracts", async ({ page }) => {
    await login(page, "USR-RO-001", "/ro/reports");
    await expect(page.getByRole("heading", { name: "Generate MPR PowerPoint" })).toBeVisible();
    await expect(page.getByLabel("Authorized team")).toBeDisabled();
    await expect(page.getByLabel("Reporting cutoff")).toHaveValue("2026-10-10");
    await expect(page.getByRole("button", { name: "Import source extract" })).toHaveCount(0);
    const response = await csrfPost(page, "/api/mpr/export", { data: exportRequest });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("presentationml.presentation");
    expect(response.headers()["content-disposition"]).toContain("MIS-Demo-MPR-Lagos-2026-10-10.pptx");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const bytes = await response.body();
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    expect(bytes.byteLength).toBeGreaterThan(50_000);

    const deniedImport = await csrfPost(page, "/api/mpr/import", {
      multipart: {
        type: "odoo-targets",
        file: { name: "targets.csv", mimeType: "text/csv", buffer: Buffer.from("source_target_id\nDENIED") },
      },
    });
    expect(deniedImport.status()).toBe(403);
  });

  test("Regional Manager sees controlled imports and generates the team artifact", async ({ page }) => {
    await login(page, "USR-RM-001", "/regional/reports");
    await expect(page.getByRole("heading", { name: "Generate MPR PowerPoint" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import source extract" })).toBeVisible();

    const template = await page.request.get("/api/mpr/import?type=odoo-targets");
    expect(template.status()).toBe(200);
    const templateText = await template.text();
    expect(templateText).toContain("source_target_id,reporting_year,target_period_start,target_period_end,team_id,ro_id,target_type,target_amount_ngn,currency,effective_date,source_version");
    expect(templateText).toContain(",LAG,RO-LAG-01,");
    const positionTemplate = await page.request.get("/api/mpr/import?type=symplus-positions");
    expect(positionTemplate.status()).toBe(200);
    expect(await positionTemplate.text()).toContain("source_position_id,position_as_of_date,team_id,ro_id,investment_account_id,product,currency,balance_sheet_position_ngn,source_version");

    const outsideScope = [
      "source_target_id,reporting_year,target_period_start,target_period_end,team_id,ro_id,target_type,target_amount_ngn,currency,effective_date,source_version",
      "TARGET-X,2026,2026-01-01,2026-12-31,ABJ,RO-ABJ-01,NEW_TARGET_ANNUAL,1200000000,NGN,2026-01-01,test-v1",
    ].join("\n");
    const rejected = await csrfPost(page, "/api/mpr/import", {
      multipart: {
        type: "odoo-targets",
        file: { name: "outside-scope.csv", mimeType: "text/csv", buffer: Buffer.from(outsideScope) },
      },
    });
    expect(rejected.status()).toBe(403);
    expect((await rejected.json()).error).toContain("outside your authorized team scope");

    const response = await csrfPost(page, "/api/mpr/export", { data: exportRequest });
    expect(response.status()).toBe(200);
    const bytes = await response.body();
    const repeated = await csrfPost(page, "/api/mpr/export", { data: exportRequest });
    expect(repeated.status()).toBe(200);
    const repeatedBytes = await repeated.body();
    expect(repeatedBytes.subarray(0, 2).toString()).toBe("PK");
    expect(Math.abs(repeatedBytes.byteLength - bytes.byteLength)).toBeLessThan(1024);
    const artifactDir = path.join(process.cwd(), "doc", "qa", "mpr");
    await mkdir(artifactDir, { recursive: true });
    await writeFile(path.join(artifactDir, "MIS-Demo-MPR-Lagos-2026-10-10.pptx"), bytes);
    expect(bytes.subarray(0, 2).toString()).toBe("PK");

    const completeTargets = [
      "source_target_id,reporting_year,target_period_start,target_period_end,team_id,ro_id,target_type,target_amount_ngn,currency,effective_date,source_version",
      "MPR-IDEMPOTENCY-LAG-01,2026,2026-01-01,2026-12-31,LAG,RO-LAG-01,NEW_TARGET_ANNUAL,1200000000,NGN,2026-01-01,mpr-idempotency-test-v1",
      "MPR-IDEMPOTENCY-LAG-02,2026,2026-01-01,2026-12-31,LAG,RO-LAG-02,NEW_TARGET_ANNUAL,1200000000,NGN,2026-01-01,mpr-idempotency-test-v1",
    ].join("\n");
    let importId = "";
    try {
      const first = await csrfPost(page, "/api/mpr/import", {
        multipart: { type: "odoo-targets", file: { name: "idempotent-targets.csv", mimeType: "text/csv", buffer: Buffer.from(completeTargets) } },
      });
      expect(first.status()).toBe(200);
      const firstResult = await first.json() as { importId: string; rows: number; idempotent: boolean };
      importId = firstResult.importId;
      expect(firstResult.rows).toBe(2);
      const second = await csrfPost(page, "/api/mpr/import", {
        multipart: { type: "odoo-targets", file: { name: "idempotent-targets.csv", mimeType: "text/csv", buffer: Buffer.from(completeTargets) } },
      });
      expect(second.status()).toBe(200);
      const secondResult = await second.json() as { importId: string; rows: number; idempotent: boolean };
      expect(secondResult.importId).toBe(firstResult.importId);
      expect(secondResult.rows).toBe(2);
      expect(secondResult.idempotent).toBeTruthy();
    } finally {
      if (importId) {
        const database = new DatabaseSync(path.join(process.cwd(), ".local", "mis-financial-sample", "reporting.sqlite"));
        try {
          database.exec("BEGIN IMMEDIATE");
          database.prepare("DELETE FROM mpr_odoo_targets WHERE import_id = ?").run(importId);
          database.prepare("DELETE FROM mpr_source_imports WHERE import_id = ?").run(importId);
          database.exec("COMMIT");
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        } finally { database.close(); }
      }
    }
  });
});
