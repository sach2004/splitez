"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "credentials" | null>(null);
  return (
    <main className="app-shell"><div className="form-content pt-16">
      <h1 className="page-title">Login</h1>
      <HapticButton onClick={() => { setLoading("google"); signIn("google", { callbackUrl: "/dashboard" }); }} loading={loading === "google"} loadingText="Opening..." spinnerDark className="btn-secondary mt-8 w-full text-base">Continue with Google</HapticButton>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field mt-5 h-13 px-4" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="input-field mt-3 h-13 px-4" />
      <HapticButton onClick={() => { setLoading("credentials"); signIn("credentials", { email, password, callbackUrl: "/dashboard" }); }} loading={loading === "credentials"} loadingText="Logging in..." className="btn-primary mt-5 w-full">Login</HapticButton>
      <Link href="/signup" className="mt-5 block text-center text-sm font-black text-mint-700">Create account</Link>
    </div></main>
  );
}
