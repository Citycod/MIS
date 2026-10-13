"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { MOCK_USERS } from "@/mocks/fixtures";

export default function LoginPage() {
  const router = useRouter();
  const personas = useMemo(() => Object.values(MOCK_USERS), []);
  const [email, setEmail] = useState(personas[0]?.email ?? "");
  const [password, setPassword] = useState("demo");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const user = personas.find(persona => persona.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password !== "demo") {
      setError("Use a listed development persona and the development password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) throw new Error("Sign in failed");
      router.push(user.role === "REGIONAL_MANAGER" ? "/regional/dashboard" : "/ro/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="samtl-wordmark" aria-label="SAMTL">SAMTL</div>
        <h1 id="login-heading">Sign in to your Account</h1>
        <form onSubmit={signIn} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-[#252525]">
            Email Address
            <input className="samtl-input" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
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
          {error && <p role="alert" className="text-sm text-[#A51F27]">{error}</p>}
          <button className="samtl-primary-button w-full" disabled={loading} type="submit">{loading ? "Signing in…" : "Continue"}</button>
        </form>
        <details className="mt-5 border-t border-[#E5E5E5] pt-4 text-sm text-[#737373]">
          <summary className="cursor-pointer font-medium text-[#651015]">Development access</summary>
          <p className="mt-2 text-xs leading-5">Select a test persona. The development password is <strong>demo</strong>.</p>
          <select className="samtl-input mt-3" aria-label="Development persona" value={email} onChange={event => { setEmail(event.target.value); setPassword("demo"); setError(""); }}>
            {personas.map(persona => <option key={persona.id} value={persona.email}>{persona.name} · {persona.role === "REGIONAL_MANAGER" ? "Regional Manager" : "Relationship Officer"}</option>)}
          </select>
        </details>
      </section>
    </main>
  );
}
