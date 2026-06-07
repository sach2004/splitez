"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (loading) return;
    setLoading(true);
    const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
    if (!r.ok) { alert((await r.json()).error); setLoading(false); return; }
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  }
  return (
    <main className="app-shell"><div className="form-content pt-16">
      <h1 className="page-title">Sign up</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input-field mt-8 h-13 px-4" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field mt-3 h-13 px-4" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="input-field mt-3 h-13 px-4" />
      <HapticButton onClick={submit} loading={loading} loadingText="Creating..." className="btn-primary mt-5 w-full">Create account</HapticButton>
      <Link href="/login" className="mt-5 block text-center text-sm font-black text-mint-700">Login instead</Link>
    </div></main>
  );
}
