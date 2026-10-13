import "server-only";
import { resolveMisDataConfig, type MisDataMode } from "./data-mode-config";

export type { MisDataMode } from "./data-mode-config";

export function getMisDataMode(): MisDataMode {
  return resolveMisDataConfig(process.env).mode;
}

export function getDemoV2DatabasePath(): string {
  const config = resolveMisDataConfig(process.env);
  if (config.mode !== "demo-v2" || !config.databasePath) throw new Error("The demo-v2 database is not active.");
  return config.databasePath;
}
