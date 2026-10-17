"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { csrfFetch } from "@/lib/client/csrf";

export function MfaEnrollment({ enabled, privileged }: { enabled: boolean; privileged: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [factorId, setFactorId] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [complete, setComplete] = useState(enabled);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true); setError("");
    try {
      const response = await csrfFetch("/api/auth/mfa/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", currentPassword }) });
      const body = await response.json() as { error?: string; factorId?: string; secret?: string; uri?: string };
      if (!response.ok || !body.factorId || !body.secret || !body.uri) throw new Error(body.error || "MFA enrollment could not start.");
      setFactorId(body.factorId); setSecret(body.secret); setUri(body.uri); setCurrentPassword("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "MFA enrollment could not start."); }
    finally { setLoading(false); }
  }

  async function confirm() {
    setLoading(true); setError("");
    try {
      const response = await csrfFetch("/api/auth/mfa/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", factorId, code }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The authenticator code could not be verified.");
      setComplete(true); setSecret(""); setUri(""); setCode("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The authenticator code could not be verified."); }
    finally { setLoading(false); }
  }

  if (complete) return <div className="flex items-start gap-3 rounded-lg border border-[#B7DFC9] bg-[#F0FAF4] p-4 text-sm text-[#216E39]"><ShieldCheck size={19} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Authenticator app enabled</p><p className="mt-1 text-xs leading-5">Future sign-ins require a six-digit authenticator code.</p></div></div>;

  return <div className="space-y-4">
    {privileged && <p className="rounded-lg border border-[#E8D5D7] bg-[#FCF6F6] p-3 text-xs leading-5 text-[#651015]">Authenticator enrollment is required before you can perform privileged user-administration actions.</p>}
    {!factorId ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-medium text-[#252525]">Current password<input className="samtl-input" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label><button type="button" className="samtl-primary-button shrink-0" onClick={start} disabled={loading || !currentPassword}>Set up authenticator</button></div> : <div className="space-y-4">
      <div className="rounded-lg bg-[#F8F9FA] p-4 text-xs leading-5 text-[#4B4B4B]"><p>1. Add an account in your approved authenticator app.</p><p className="mt-2">2. Enter this setup key:</p><code className="mt-1 block break-all rounded bg-white p-2 font-mono text-[#252525]">{secret}</code><details className="mt-2"><summary className="cursor-pointer font-semibold text-[#651015]">Show provisioning URI</summary><code className="mt-2 block break-all rounded bg-white p-2 font-mono">{uri}</code></details></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-medium text-[#252525]">Six-digit code<input className="samtl-input font-mono tracking-[0.25em]" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/gu, ""))} /></label><button type="button" className="samtl-primary-button shrink-0" onClick={confirm} disabled={loading || code.length !== 6}>Verify authenticator</button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-[#A51F27]">{error}</p>}
  </div>;
}
