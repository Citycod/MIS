export type MisDataMode = "phase2" | "demo-v2";

export interface MisDataConfig {
  mode: MisDataMode;
  databasePath?: string;
}

type Environment = Record<string, string | undefined>;

export function resolveMisDataConfig(environment: Environment): MisDataConfig {
  const mode = environment.MIS_DATA_MODE || "phase2";
  if (mode !== "phase2" && mode !== "demo-v2") {
    throw new Error(`Unsupported MIS_DATA_MODE: ${mode}`);
  }
  if (mode === "phase2") return { mode };

  const runtime = environment.MIS_DEMO_V2_RUNTIME || environment.NODE_ENV;
  if (environment.MIS_DEMO_V2_ALLOWED !== "true" || (runtime !== "development" && runtime !== "test")) {
    throw new Error("MIS demo-v2 requires an explicitly authorized development or test runtime.");
  }
  if (!environment.MIS_DEMO_V2_SQLITE_PATH) {
    throw new Error("MIS_DEMO_V2_SQLITE_PATH is required in demo-v2 mode.");
  }
  return { mode, databasePath: environment.MIS_DEMO_V2_SQLITE_PATH };
}
