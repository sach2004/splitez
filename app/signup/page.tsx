"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";
import { toast } from "@/lib/toast";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    if (!name.trim()) return toast("Enter your name", "error");
    if (!email.trim()) return toast("Enter your email", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await r.json();
      if (!r.ok) { toast(data.error || "Signup failed", "error"); setLoading(false); return; }
      await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    } catch {
      toast("Something went wrong. Try again.", "error");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Create account</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Split expenses with friends</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoCapitalize="words" disabled={loading} className="input-field mt-8 h-[52px] px-4" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" autoCapitalize="none" disabled={loading} className="input-field mt-3 h-[52px] px-4" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" disabled={loading} className="input-field mt-3 h-[52px] px-4" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <HapticButton onClick={submit} loading={loading} loadingText="Creating account…" className="btn-primary mt-5 w-full text-[15px]">Create Account</HapticButton>
        <Link href="/login" className="mt-5 block text-center text-[14px] font-black text-mint-700">Already have an account? Login</Link>
      </div>
    </main>
  );
}
