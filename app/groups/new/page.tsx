"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BackTitle from "@/components/BackTitle";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";

export default function NewGroup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, guestSessionId: getGuestSessionId(), guestName: "You" }) });
      const group = await res.json();
      if (!res.ok) throw new Error(group.error || "Could not create group");
      router.push(`/groups/${group.id}`);
    } catch (err: any) {
      alert(err.message || "Could not create group");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <BackTitle title="New Group" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group Name" className="input-field h-14 px-5 text-xl" />
        <HapticButton onClick={submit} loading={loading} loadingText="Creating..." className="btn-primary mt-7 w-full text-lg">Create Group</HapticButton>
      </div>
    </main>
  );
}
