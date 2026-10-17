import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getCurrentSession } from "@/lib/server/security/auth";

export default async function RequiredPasswordChangePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.mustChangePassword) redirect("/dashboard");
  return <main className="login-shell">
    <section className="login-card" aria-labelledby="password-heading">
      <div className="samtl-wordmark" aria-label="SAMTL">SAMTL</div>
      <h1 id="password-heading">Create a new password</h1>
      <p className="mt-2 text-sm leading-6 text-[#667085]">Your temporary password must be replaced before you can open MIS.</p>
      <div className="mt-7"><ChangePasswordForm required /></div>
    </section>
  </main>;
}
