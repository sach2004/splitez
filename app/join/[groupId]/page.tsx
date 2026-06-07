"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { toast } from "@/lib/toast";

export default function Join({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function join() {
    const trimmed = name.trim();
    if (!trimmed) return toast("Enter your name", "error");
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuest: true, name: trimmed, guestSessionId: getGuestSessionId() }),
      });
      if (!res.ok) throw new Error("Failed to join");
      toast("Joined!", "success");
      router.push(`/groups/${groupId}`);
    } catch {
      toast("Failed to join group", "error");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Join group</h1>
        <p className="mt-3 text-[15px] text-[var(--muted)]">Enter your name to join as a guest — no sign-up needed.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={loading} className="input-field mt-7 h-[52px] px-4" autoFocus onKeyDown={(e) => e.key === "Enter" && join()} />
        <HapticButton onClick={join} loading={loading} loadingText="Joining…" className="btn-primary mt-5 w-full text-[15px]">Join Group</HapticButton>
      </div>
    </main>
  );
}
