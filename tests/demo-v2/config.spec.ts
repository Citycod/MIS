import { expect, test } from "@playwright/test";
import { resolveMisDataConfig } from "../../src/lib/server/repository/data-mode-config";

test("phase2 is the default and unknown modes fail closed", () => {
  expect(resolveMisDataConfig({})).toEqual({ mode: "phase2" });
  expect(() => resolveMisDataConfig({ MIS_DATA_MODE: "unknown" })).toThrow("Unsupported MIS_DATA_MODE");
});

test("demo-v2 requires an authorized non-production runtime and a database path", () => {
  const base = { MIS_DATA_MODE: "demo-v2", MIS_DEMO_V2_ALLOWED: "true" };
  expect(() => resolveMisDataConfig({ ...base, MIS_DEMO_V2_RUNTIME: "production", MIS_DEMO_V2_SQLITE_PATH: "/tmp/demo.sqlite" })).toThrow("authorized development or test runtime");
  expect(() => resolveMisDataConfig({ ...base, MIS_DEMO_V2_RUNTIME: "test" })).toThrow("MIS_DEMO_V2_SQLITE_PATH is required");
  expect(resolveMisDataConfig({ ...base, MIS_DEMO_V2_RUNTIME: "test", MIS_DEMO_V2_SQLITE_PATH: "/tmp/demo.sqlite" }))
    .toEqual({ mode: "demo-v2", databasePath: "/tmp/demo.sqlite" });
});
