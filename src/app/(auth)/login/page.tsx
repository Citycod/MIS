"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { csrfFetch, getCsrfToken } from "@/lib/client/csrf";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void getCsrfToken().catch(() => setError("Unable to initialize secure sign-in.")); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await csrfFetch(mfaRequired ? "/api/auth/mfa/verify" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mfaRequired ? { code: mfaCode } : { username, password }),
      });
      const body = await response.json() as { error?: string; mfaRequired?: boolean; redirectTo?: string };
      if (!response.ok) throw new Error(body.error || "Sign in failed.");
      if (body.mfaRequired) {
        setMfaRequired(true);
        setPassword("");
        return;
      }
      router.push(body.redirectTo || "/dashboard");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="samtl-wordmark" aria-label="SAMTL">SAMTL</div>
        <h1 id="login-heading">{mfaRequired ? "Verify your identity" : "Sign in to your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          {mfaRequired ? "Enter the six-digit code from your approved authenticator app." : "Use your assigned staff ID or username and password."}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {!mfaRequired && <>
            <label className="block text-sm font-medium text-[#252525]">
              Staff ID or username
              <input className="samtl-input" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required autoFocus />
            </label>
            <label className="block text-sm font-medium text-[#252525]">
              Password
              <span className="relative mt-2 block">
                <input className="samtl-input mt-0! pr-12!" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
                <button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#737373]" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          </>}
          {mfaRequired && <label className="block text-sm font-medium text-[#252525]">
            Authenticator code
            <input className="samtl-input text-center font-mono text-lg tracking-[0.35em]" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={mfaCode} onChange={event => setMfaCode(event.target.value.replace(/\D/gu, ""))} required autoFocus />
          </label>}
          {error && <p role="alert" className="text-sm text-[#A51F27]">{error}</p>}
          <button className="samtl-primary-button w-full" disabled={loading} type="submit">{loading ? "Checking…" : mfaRequired ? "Verify and continue" : "Continue"}</button>
          {mfaRequired && <button type="button" className="w-full text-sm font-semibold text-[#651015]" onClick={() => { setMfaRequired(false); setMfaCode(""); setError(""); }}>Use another account</button>}
        </form>
        <div className="mt-6 flex gap-3 border-t border-[#E5E5E5] pt-5 text-xs leading-5 text-[#667085]">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#A51F27]" aria-hidden="true" />
          <p>Access is limited to authorized staff. Contact an MIS administrator for account activation or approved password recovery.</p>
        </div>
      </section>
    </main>
  );
}
