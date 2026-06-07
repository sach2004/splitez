"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";

export default function Login() {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "creds" | null>(null);

  async function loginCreds() {
    if (loading) return;
    if (!email.trim()) return alert("Enter your email");
    if (!password) return alert("Enter your password");
    setLoading("creds");
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    setLoading(null);
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Welcome back</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Sign in to your account</p>

        <HapticButton
          onClick={() => {
            if (loading) return;
            setLoading("google");
            signIn("google", { callbackUrl: "/dashboard" });
          }}
          loading={loading === "google"}
          loadingText="Opening Google…"
          spinnerDark
          className="btn-secondary mt-8 w-full text-[15px]"
        >
          Continue with Google
        </HapticButton>

        <div className="my-5 flex items-center gap-3 text-[12px] text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">
          or
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          inputMode="email"
          autoCapitalize="none"
          disabled={loading === "creds"}
          className="input-field h-[52px] px-4"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          disabled={loading === "creds"}
          className="input-field mt-3 h-[52px] px-4"
          onKeyDown={(e) => e.key === "Enter" && loginCreds()}
        />
        <HapticButton
          onClick={loginCreds}
          loading={loading === "creds"}
          loadingText="Logging in…"
          className="btn-primary mt-5 w-full text-[15px]"
        >
          Login
        </HapticButton>

        <Link href="/signup" className="mt-5 block text-center text-[13px] font-black text-mint-700">
          Don&apos;t have an account? Sign up
        </Link>
      </div>
    </main>
  );
}
