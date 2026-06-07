"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";

export default function Join({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function join() {
    if (!name.trim() || loading) return;
    setLoading(true);
    await fetch(`/api/groups/${groupId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isGuest: true, name, guestSessionId: getGuestSessionId() }) });
    router.push(`/groups/${groupId}`);
  }
  return <main className="app-shell"><div className="form-content pt-16"><h1 className="page-title">Join group</h1><p className="mt-3 text-[16px] text-neutral-600">Enter your name to join as a guest.</p><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field mt-8 h-14 px-4 text-xl" /><HapticButton onClick={join} loading={loading} loadingText="Joining..." className="btn-primary mt-6 w-full text-lg">Join</HapticButton></div></main>;
}
