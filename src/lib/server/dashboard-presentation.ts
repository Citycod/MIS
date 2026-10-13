import "server-only";
import { normalizeRoleView, ROLE_VIEWS } from "@/lib/filters";
import type { RoleView } from "@/types/filter";

type Chart = "movement" | "position" | "comparison" | "mix";
type Section = "flows" | "charts" | "comparison" | "movement";
const layouts: Record<RoleView, { charts: Chart[]; sections: Section[] }> = {
  "portfolio-overview": {
    charts: ["movement", "position", "comparison", "mix"],
    sections: ["flows", "charts", "comparison", "movement"],
  },
  "investment-breakdown": {
    charts: ["mix", "position", "movement", "comparison"],
    sections: ["charts", "flows", "comparison", "movement"],
  },
  "monthly-movement": {
    charts: ["movement", "position", "comparison", "mix"],
    sections: ["charts", "movement", "flows", "comparison"],
  },
};

// This module receives no principal or entitlements and never selects records,
// resources or financial definitions. Only the render order changes.
export function getDashboardPresentation(value: unknown) {
  const roleView = normalizeRoleView(value);
  return { roleView, label: ROLE_VIEWS.find(view => view.value === roleView)!.label, ...layouts[roleView] };
}
