import Link from "next/link";
import { redirect } from "next/navigation";
import { UserAdministrationClient } from "@/components/admin/user-administration-client";
import { getCurrentSession } from "@/lib/server/security/auth";
import { IdentityPermissions, listAuditEvents, listManagedIdentityUsers } from "@/lib/server/identity/store";

export default async function UserAdministrationPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.permissions.includes(IdentityPermissions.manageUsers)) redirect("/forbidden");
  if (!session.mfaEnabled || !session.mfaVerified) return <section className="mx-auto max-w-2xl rounded-xl border border-[#E8D5D7] bg-white p-8 text-center shadow-xs">
    <h2 className="text-xl font-bold text-[#252525]">Authenticator verification required</h2>
    <p className="mt-3 text-sm leading-6 text-[#667085]">Privileged user administration is available only after you enroll and verify an authenticator app.</p>
    <Link className="samtl-primary-button mt-5 inline-flex" href="/profile">Open security settings</Link>
  </section>;
  const events = listAuditEvents().map(row => ({
    id: String(row.id), occurredAt: new Date(Number(row.occurred_at)).toISOString(), actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    action: String(row.action), targetId: row.target_id ? String(row.target_id) : null, outcome: String(row.outcome),
  }));
  return <UserAdministrationClient initialUsers={listManagedIdentityUsers()} auditEvents={events} />;
}
