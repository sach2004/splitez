"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Mail, UserRound } from "lucide-react";
import BackTitle from "@/components/BackTitle";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { toast } from "@/lib/toast";
import { shareOrCopy } from "@/lib/share";

export default function AddMember({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [guest, setGuest] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const router = useRouter();

  async function add() {
    if (loading) return;
    if (guest && !name.trim()) return toast("Enter a guest name", "error");
    if (!guest && !email.trim()) return toast("Enter their email", "error");
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuest: guest, name: name.trim(), email: email.trim(), guestSessionId: getGuestSessionId() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to add member"); }
      toast("Member added", "success");
      router.push(`/groups/${groupId}`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to add member", "error");
      setLoading(false);
    }
  }

  async function invite() {
    if (copying) return;
    setCopying(true);
    const r = await shareOrCopy(`${location.origin}/join/${groupId}`, "Join my group on SplitEZ");
    setCopying(false);
    toast(r === "shared" ? "Shared!" : r === "copied" ? "Invite link copied" : "Couldn't copy link", r === "failed" ? "error" : "success");
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <BackTitle title="Add Member" href={`/groups/${groupId}`} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-black tracking-tight">{guest ? "Add as guest" : "Add member"}</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">{guest ? "No SplitEZ account needed" : "Must have a SplitEZ account"}</p>
          </div>
          <button onClick={() => setGuest((g) => !g)} className="shrink-0 tap-scale" aria-label="Toggle guest">
            <span className={["relative flex h-8 w-[52px] items-center rounded-full border-2 transition-all duration-200", guest ? "border-mint-300 bg-mint-100 dark:bg-mint-800/40 dark:border-mint-600" : "border-[var(--line)] bg-[var(--soft)]"].join(" ")}>
              <span className={["absolute h-5 w-5 rounded-full shadow-sm transition-all duration-200", guest ? "translate-x-[26px] bg-mint-700" : "translate-x-[2px] bg-neutral-400 dark:bg-neutral-500"].join(" ")} />
            </span>
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {guest && (
            <div className="input-field flex h-[52px] items-center gap-3 px-4">
              <UserRound className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" disabled={loading} className="w-full bg-transparent text-[16px] outline-none" />
            </div>
          )}
          <div className="input-field flex h-[52px] items-center gap-3 px-4">
            <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={guest ? "Email — optional" : "Their email address"} inputMode="email" autoCapitalize="none" disabled={loading} className="w-full bg-transparent text-[16px] outline-none" />
          </div>
        </div>
        <HapticButton onClick={add} loading={loading} loadingText={guest ? "Adding guest…" : "Adding member…"} className="btn-primary mt-6 w-full text-[15px]">{guest ? "Add Guest" : "Add Member"}</HapticButton>
        <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">or invite via link</div>
        <HapticButton onClick={invite} loading={copying} loadingText="Sharing…" className="btn-primary w-full gap-2 text-[15px]"><LinkIcon className="h-4 w-4 shrink-0" />Share Invite Link</HapticButton>
      </div>
    </main>
  );
}
