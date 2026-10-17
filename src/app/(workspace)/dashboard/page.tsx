import { redirect } from "next/navigation";
import type { SearchParams } from "@/lib/filters";
import { getCurrentSession } from "@/lib/server/security/auth";

export default async function DashboardEntryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const raw = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") query.set(key, value);
  }

  if (!query.has("source")) query.set("source", "financial-sample");

  const dashboardPath = session.user.role === "REGIONAL_MANAGER"
    ? "/regional/dashboard"
    : "/ro/dashboard";

  redirect(`${dashboardPath}?${query.toString()}`);
}
