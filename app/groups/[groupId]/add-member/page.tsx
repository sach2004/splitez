"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Mail, UserRound } from "lucide-react";
import BackTitle from "@/components/BackTitle";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";

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
    if (guest && !name.trim()) return alert("Enter a guest name");
    if (!guest && !email.trim()) return alert("Enter an email");
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isGuest: guest, name, email, guestSessionId: getGuestSessionId() }) });
      if (!res.ok) throw new Error("Failed to add member");
      router.push(`/groups/${groupId}`);
    } catch (e: any) {
      alert(e.message || "Failed to add member");
      setLoading(false);
    }
  }

  async function invite() {
    if (copying) return;
    setCopying(true);
    await navigator.clipboard.writeText(`${location.origin}/join/${groupId}`);
    setTimeout(() => setCopying(false), 900);
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <BackTitle title="Add Member" href={`/groups/${groupId}`} />
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-[25px] font-black tracking-[-.03em]">{guest ? "Add as guest" : "Add member"}</h1><p className="mt-2 text-[16px] leading-6 text-neutral-600 dark:text-neutral-400">{guest ? "User doesn't have a Splitwell account" : "User must have a Splitwell account"}</p></div>
          <HapticButton onClick={() => setGuest(!guest)} className="mt-1 flex items-center gap-2 text-sm font-black text-mint-700">
            Guest<span className={`relative h-8 w-14 rounded-full border-[3px] transition-colors ${guest ? "border-mint-200 bg-mint-200" : "border-neutral-400"}`}><span className={`absolute top-1 h-4 w-4 rounded-full transition-all ${guest ? "right-1 bg-mint-700" : "left-1 bg-neutral-500"}`} /></span>
          </HapticButton>
        </div>
        <div className="mt-8 space-y-4">
          {guest && <div className="input-field flex h-14 items-center gap-3 px-4"><UserRound className="h-5 w-5 text-neutral-600" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full bg-transparent text-xl outline-none" /></div>}
          <div className="input-field flex h-14 items-center gap-3 px-4"><Mail className="h-5 w-5 text-neutral-600" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={guest ? "Email — Optional" : "Enter their email"} className="w-full bg-transparent text-xl outline-none" /></div>
          {guest && <p className="text-[14px] leading-5 text-neutral-600">If email is provided, they can sign up later with this email to see their expenses.</p>}
        </div>
        <HapticButton onClick={add} loading={loading} loadingText={guest ? "Adding..." : "Adding..."} className="btn-primary mt-6 w-full text-lg">{guest ? "Add Guest" : "Add Member"}</HapticButton>
        <div className="my-7 flex items-center gap-4 text-center text-sm text-neutral-500 before:h-px before:flex-1 before:bg-neutral-200 after:h-px after:flex-1 after:bg-neutral-200">or invite via link</div>
        <HapticButton onClick={invite} loading={copying} loadingText="Copied" className="btn-primary w-full gap-3 text-lg"><LinkIcon className="h-5 w-5" />Invite Members</HapticButton>
        <p className="mt-4 text-center text-[15px] leading-6 text-neutral-600">Members can join this group using a link, no email needed</p>
      </div>
    </main>
  );
}
