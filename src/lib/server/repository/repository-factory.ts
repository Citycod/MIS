import "server-only";
import type { PerformanceRepository } from "@/types/repository";
import { getMisDataMode } from "./data-mode";
import { DemoV2PerformanceRepository } from "./demo-v2-repository";
import { MockPerformanceRepository } from "./mock-repository";

export function getPerformanceRepository(): PerformanceRepository {
  return getMisDataMode() === "demo-v2" ? new DemoV2PerformanceRepository() : new MockPerformanceRepository();
}
