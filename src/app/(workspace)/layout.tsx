import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/security/auth";
import { normalizeAuthorizedScope } from "@/lib/server/security/scope";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { WorkspaceFilterBar } from "@/components/filters/global-filter-bar";
import { getFilterOptions } from "@/lib/server/security/filter-options";
import { MOCK_REGIONS } from "@/mocks/fixtures";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { scope, filters } = normalizeAuthorizedScope(session.user);
  const regionObj = MOCK_REGIONS.find((r) => r.id === scope.effectiveRegionId);
  const regionName = regionObj ? regionObj.name : scope.effectiveRegionId;

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Sidebar Navigation */}
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        userTitle={session.user.title}
        regionName={regionName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={session.user} />

        <main id="main-content" className="min-w-0 flex-1 p-4 md:p-6 lg:p-7">
          {/* Universal Global Filter Bar above content */}
          <WorkspaceFilterBar scope={scope} initialFilters={filters} options={getFilterOptions(session.user)} />

          {/* Page Body */}
          {children}
        </main>
      </div>
    </div>
  );
}
