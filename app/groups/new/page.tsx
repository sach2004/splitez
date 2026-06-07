"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackTitle from "@/components/BackTitle";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { toast } from "@/lib/toast";

export default function NewGroup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return toast("Enter a group name", "error");
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, guestSessionId: getGuestSessionId(), guestName: "You" }),
      });
      const group = await res.json();
      if (!res.ok) throw new Error(group.error || "Could not create group");
      toast("Group created", "success");
      router.push(`/groups/${group.id}`);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not create group", "error");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <BackTitle title="New Group" />
        <h1 className="text-[22px] font-black tracking-tight">Name your group</h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">You can always rename it later.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa Trip, Flat Mates…" className="input-field mt-6 h-[52px] px-4" autoFocus disabled={loading} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <HapticButton onClick={submit} loading={loading} loadingText="Creating…" className="btn-primary mt-5 w-full text-[15px]">Create Group</HapticButton>
      </div>
    </main>
  );
}
