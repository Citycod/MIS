"use client";

import { useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldAlert, UserCog } from "lucide-react";
import { csrfFetch } from "@/lib/client/csrf";
import type { ManagedIdentityUser } from "@/lib/server/identity/types";

interface AuditEvent {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  action: string;
  targetId: string | null;
  outcome: string;
}

const emptyUser = {
  id: "", staffId: "", displayName: "", email: "", title: "", branchName: "", role: "RO", regionId: "",
  roId: "", allowedRegionIds: "", allowedRoIds: "", temporaryPassword: "", canManageUsers: false,
};

function values(value: string): string[] { return value.split(",").map(item => item.trim()).filter(Boolean); }

export function UserAdministrationClient({ initialUsers, auditEvents }: { initialUsers: ManagedIdentityUser[]; auditEvents: AuditEvent[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [draft, setDraft] = useState(emptyUser);
  const [selectedId, setSelectedId] = useState(initialUsers[0]?.id ?? "");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = users.find(user => user.id === selectedId);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await csrfFetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string; user?: ManagedIdentityUser; count?: number };
      if (!response.ok) throw new Error(payload.error || "User administration request failed.");
      if (payload.user) setUsers(current => [...current.filter(user => user.id !== payload.user!.id), payload.user!].sort((a, b) => a.displayName.localeCompare(b.displayName)));
      return payload;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "User administration request failed.");
      return null;
    } finally { setBusy(false); }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    const payload = await send({ ...draft, action: "create", allowedRegionIds: values(draft.allowedRegionIds), allowedRoIds: values(draft.allowedRoIds) });
    if (payload?.user) { setDraft(emptyUser); setSelectedId(payload.user.id); setMessage("Staff account created with a temporary password."); }
  }

  async function updateSelected(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const payload = await send({
      action: "update", userId: selected.id, displayName: data.get("displayName"), email: data.get("email"), title: data.get("title"),
      branchName: data.get("branchName"), status: data.get("status"), role: data.get("role"), regionId: data.get("regionId"),
      roId: data.get("roId") || null, allowedRegionIds: values(String(data.get("allowedRegionIds") ?? "")),
      allowedRoIds: values(String(data.get("allowedRoIds") ?? "")), canManageUsers: data.get("canManageUsers") === "on",
    });
    if (payload?.user) setMessage("Staff profile and effective assignment updated.");
  }

  async function resetPassword() {
    if (!selected || !temporaryPassword) return;
    const payload = await send({ action: "reset-password", userId: selected.id, temporaryPassword });
    if (payload) { setTemporaryPassword(""); setMessage("Temporary password issued. The user must change it at next sign-in."); }
  }

  async function revokeSessions() {
    if (!selected) return;
    const payload = await send({ action: "revoke-sessions", userId: selected.id });
    if (payload) setMessage(`${payload.count ?? 0} active session(s) revoked.`);
  }

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A51F27]">Identity administration</p>
      <h2 className="mt-1 text-2xl font-bold text-[#252525]">Staff access and lifecycle</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">Authentication identities, reporting assignments and administrative permission are managed separately. Assignment changes are effective-dated and do not expand financial access outside the saved scope.</p>
    </header>
    {error && <p role="alert" className="rounded-lg border border-[#E8B4B8] bg-[#FFF5F5] px-4 py-3 text-sm text-[#A51F27]">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-[#B7DFC9] bg-[#F0FAF4] px-4 py-3 text-sm text-[#16794A]">{message}</p>}

    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form onSubmit={createUser} className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-xs">
        <h3 className="flex items-center gap-2 font-bold text-[#252525]"><Plus size={18} className="text-[#A51F27]" /> Provision staff account</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["id", "staffId", "displayName", "email", "title", "branchName", "regionId", "roId"] as const).map(key => <label key={key} className="text-xs font-medium text-[#4B4B4B]">{({ id: "Internal MIS user ID", staffId: "Staff ID", displayName: "Display name", email: "Email", title: "Job title", branchName: "Branch or office", regionId: "Region ID", roId: "RO ID (for RO role)" } as const)[key]}
            <input className="samtl-input" type={key === "email" ? "email" : "text"} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} required={!(["branchName", "roId"] as string[]).includes(key)} />
          </label>)}
          <label className="text-xs font-medium text-[#4B4B4B]">Financial role
            <select className="samtl-input" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}><option value="RO">Relationship Officer</option><option value="REGIONAL_MANAGER">Regional Manager</option></select>
          </label>
          <label className="text-xs font-medium text-[#4B4B4B]">Temporary password
            <input className="samtl-input" type="password" value={draft.temporaryPassword} onChange={event => setDraft({ ...draft, temporaryPassword: event.target.value })} minLength={12} required />
          </label>
          <label className="text-xs font-medium text-[#4B4B4B] sm:col-span-2">Allowed region IDs (comma separated)
            <input className="samtl-input" value={draft.allowedRegionIds} onChange={event => setDraft({ ...draft, allowedRegionIds: event.target.value })} required />
          </label>
          <label className="text-xs font-medium text-[#4B4B4B] sm:col-span-2">Allowed RO IDs (comma separated)
            <input className="samtl-input" value={draft.allowedRoIds} onChange={event => setDraft({ ...draft, allowedRoIds: event.target.value })} required />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-[#4B4B4B] sm:col-span-2"><input type="checkbox" checked={draft.canManageUsers} onChange={event => setDraft({ ...draft, canManageUsers: event.target.checked })} /> Grant user-administration permission</label>
        </div>
        <button className="samtl-primary-button mt-4" type="submit" disabled={busy}>Create staff account</button>
      </form>

      <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-xs">
        <h3 className="flex items-center gap-2 font-bold text-[#252525]"><UserCog size={18} className="text-[#A51F27]" /> Update staff access</h3>
        <label className="mt-4 block text-xs font-medium text-[#4B4B4B]">Staff account
          <select className="samtl-input" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{users.map(user => <option key={user.id} value={user.id}>{user.displayName} · {user.staffId}</option>)}</select>
        </label>
        {selected && <form key={selected.id} onSubmit={updateSelected} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#4B4B4B]">Display name<input name="displayName" className="samtl-input" defaultValue={selected.displayName} required /></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Email<input name="email" type="email" className="samtl-input" defaultValue={selected.email} required /></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Job title<input name="title" className="samtl-input" defaultValue={selected.title} required /></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Branch or office<input name="branchName" className="samtl-input" defaultValue={selected.branchName} /></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Status<select name="status" className="samtl-input" defaultValue={selected.status}><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Financial role<select name="role" className="samtl-input" defaultValue={selected.role}><option value="RO">Relationship Officer</option><option value="REGIONAL_MANAGER">Regional Manager</option></select></label>
          <label className="text-xs font-medium text-[#4B4B4B]">Region ID<input name="regionId" className="samtl-input" defaultValue={selected.regionId} required /></label>
          <label className="text-xs font-medium text-[#4B4B4B]">RO ID<input name="roId" className="samtl-input" defaultValue={selected.roId} /></label>
          <label className="text-xs font-medium text-[#4B4B4B] sm:col-span-2">Allowed region IDs<input name="allowedRegionIds" className="samtl-input" defaultValue={selected.allowedRegionIds.join(", ")} required /></label>
          <label className="text-xs font-medium text-[#4B4B4B] sm:col-span-2">Allowed RO IDs<input name="allowedRoIds" className="samtl-input" defaultValue={selected.allowedRoIds.join(", ")} required /></label>
          <label className="flex items-center gap-2 text-xs font-medium text-[#4B4B4B] sm:col-span-2"><input name="canManageUsers" type="checkbox" defaultChecked={selected.permissions.includes("identity.users.manage")} /> User-administration permission</label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button className="samtl-primary-button" type="submit" disabled={busy}>Save assignment</button><button className="secondary-button" type="button" onClick={revokeSessions} disabled={busy}><RefreshCw size={14} /> Revoke sessions</button></div>
        </form>}
        {selected && <div className="mt-5 border-t border-[#E4E7EC] pt-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[#252525]"><KeyRound size={16} /> Approved password recovery</h4>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row"><input className="samtl-input mt-0!" type="password" placeholder="Temporary password" value={temporaryPassword} onChange={event => setTemporaryPassword(event.target.value)} /><button type="button" className="secondary-button shrink-0" onClick={resetPassword} disabled={busy || !temporaryPassword}>Issue reset</button></div>
        </div>}
      </section>
    </section>

    <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-xs">
      <h3 className="flex items-center gap-2 font-bold text-[#252525]"><ShieldAlert size={18} className="text-[#A51F27]" /> Recent sensitive activity</h3>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-[#E4E7EC] text-[#667085]"><tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Outcome</th></tr></thead><tbody>{auditEvents.map(event => <tr key={event.id} className="border-b border-[#F0F1F3]"><td className="whitespace-nowrap px-3 py-2">{new Date(event.occurredAt).toLocaleString()}</td><td className="px-3 py-2 font-mono">{event.action}</td><td className="px-3 py-2">{event.actorUserId || "System"}</td><td className="px-3 py-2">{event.targetId || "—"}</td><td className="px-3 py-2 font-semibold">{event.outcome}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
