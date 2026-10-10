import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/security/auth";
import { normalizeAuthorizedScope } from "@/lib/server/security/scope";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GlobalFilterBar } from "@/components/filters/global-filter-bar";
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
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        role={session.user.role}
        userName={session.user.name}
        userTitle={session.user.title}
        regionName={regionName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={session.user} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Universal Global Filter Bar above content */}
          <GlobalFilterBar scope={scope} initialFilters={filters} />

          {/* Page Body */}
          {children}
        </main>
      </div>
    </div>
  );
}
