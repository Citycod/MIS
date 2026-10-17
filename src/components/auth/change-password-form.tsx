"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/client/csrf";

export function ChangePasswordForm({ required = false }: { required?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) { setError("The new passwords do not match."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await csrfFetch("/api/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Password change failed.");
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      if (required) { router.push("/dashboard"); router.refresh(); }
      else setMessage("Your password has been changed and other sessions were revoked.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Password change failed.");
    } finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-[#252525]">Current password
      <input className="samtl-input" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
    </label>
    <label className="block text-sm font-medium text-[#252525]">New password
      <input className="samtl-input" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={12} required />
    </label>
    <label className="block text-sm font-medium text-[#252525]">Confirm new password
      <input className="samtl-input" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} required />
    </label>
    <p className="text-xs leading-5 text-[#667085]">Use at least 12 characters with upper and lower case letters, a number and a symbol.</p>
    {error && <p role="alert" className="text-sm text-[#A51F27]">{error}</p>}
    {message && <p role="status" className="text-sm text-[#16794A]">{message}</p>}
    <button className="samtl-primary-button" type="submit" disabled={loading}>{loading ? "Saving…" : "Change password"}</button>
  </form>;
}
