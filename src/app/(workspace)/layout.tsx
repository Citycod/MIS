import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/security/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar role={session.user.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={session.user} />
        <main id="main-content" className="min-w-0 flex-1 bg-white p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
