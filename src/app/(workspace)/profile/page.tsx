import { getCurrentSession } from "@/lib/server/security/auth";
import { ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { MfaEnrollment } from "@/components/auth/mfa-enrollment";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const { user } = session;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#741F24] border-2 border-[#CF2E2E] text-white font-extrabold text-xl flex items-center justify-center shadow-md">
          {user.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
            {user.name}
            <ShieldCheck className="w-5 h-5 text-[#16794A]" />
          </h1>
          <p className="text-xs text-[#667085] font-semibold">{user.title}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded bg-[#FFF1EE] text-[#CF2E2E] text-[10px] font-extrabold uppercase tracking-wider">
            {user.role === "REGIONAL_MANAGER" ? "Regional Manager Role" : "Relationship Officer Role"}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-[#24252B] border-b border-[#E4E7EC] pb-2">
          Security & Assignment Scope
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E4E7EC]">
            <span className="text-[#667085] block mb-1">User ID / Staff Code</span>
            <strong className="text-[#24252B] font-mono">{user.id}</strong>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E4E7EC]">
            <span className="text-[#667085] block mb-1">Email Address</span>
            <strong className="text-[#24252B]">{user.email}</strong>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E4E7EC]">
            <span className="text-[#667085] block mb-1">Primary Region Scope</span>
            <strong className="text-[#CF2E2E] font-bold">{user.regionId}</strong>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E4E7EC]">
            <span className="text-[#667085] block mb-1">Assigned Branch</span>
            <strong className="text-[#24252B]">{user.branchName || "Regional Office"}</strong>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[#24252B]">Password</h3>
          <p className="mt-1 text-xs leading-5 text-[#667085]">Changing your password revokes your other active sessions.</p>
        </div>
        <ChangePasswordForm />
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E4E7EC] shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-[#24252B]">Multi-factor authentication</h3>
          <p className="mt-1 text-xs leading-5 text-[#667085]">Use an approved TOTP authenticator app as a second sign-in factor.</p>
        </div>
        <MfaEnrollment enabled={session.mfaEnabled} privileged={session.permissions.includes("identity.users.manage")} />
      </div>
    </div>
  );
}
