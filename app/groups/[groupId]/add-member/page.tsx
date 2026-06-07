"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Mail, UserRound } from "lucide-react";
import BackTitle from "@/components/BackTitle";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";

export default function AddMember({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const [guest, setGuest]     = useState(true);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const router = useRouter();

  async function add() {
    if (loading) return;
    if (guest && !name.trim()) return alert("Enter a guest name");
    if (!guest && !email.trim()) return alert("Enter their email");
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGuest: guest,
          name: name.trim(),
          email: email.trim(),
          guestSessionId: getGuestSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add member");
      }
      router.push(`/groups/${groupId}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add member");
      setLoading(false);
    }
  }

  async function invite() {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`${location.origin}/join/${groupId}`);
    } catch (_) {
      alert(`Share this link: ${location.origin}/join/${groupId}`);
    }
    setTimeout(() => setCopying(false), 1500);
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <BackTitle title="Add Member" href={`/groups/${groupId}`} />

        {/* Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-black tracking-tight">
              {guest ? "Add as guest" : "Add member"}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              {guest
                ? "No Splitwell account needed"
                : "Must have a Splitwell account"}
            </p>
          </div>

          <button
            onClick={() => setGuest((g) => !g)}
            className="shrink-0 tap-scale"
            aria-label="Toggle guest mode"
          >
            <span
              className={[
                "relative flex h-8 w-[52px] items-center rounded-full border-2 transition-all duration-200",
                guest
                  ? "border-mint-300 bg-mint-100 dark:bg-mint-800/40 dark:border-mint-600"
                  : "border-[var(--line)] bg-[var(--soft)]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute h-5 w-5 rounded-full shadow-sm transition-all duration-200",
                  guest
                    ? "translate-x-[26px] bg-mint-700"
                    : "translate-x-[2px] bg-neutral-400 dark:bg-neutral-500",
                ].join(" ")}
              />
            </span>
          </button>
        </div>

        {/* Fields */}
        <div className="mt-6 space-y-3">
          {guest && (
            <div className="input-field flex h-[52px] items-center gap-3 px-4">
              <UserRound className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                disabled={loading}
                className="w-full bg-transparent text-[16px] outline-none"
              />
            </div>
          )}
          <div className="input-field flex h-[52px] items-center gap-3 px-4">
            <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={guest ? "Email — optional" : "Their email address"}
              inputMode="email"
              autoCapitalize="none"
              disabled={loading}
              className="w-full bg-transparent text-[16px] outline-none"
            />
          </div>
          {guest && (
            <p className="text-[12px] text-[var(--muted)]">
              If you add an email, they can sign up later and see their expenses.
            </p>
          )}
        </div>

        <HapticButton
          onClick={add}
          loading={loading}
          loadingText={guest ? "Adding guest…" : "Adding member…"}
          className="btn-primary mt-6 w-full text-[15px]"
        >
          {guest ? "Add Guest" : "Add Member"}
        </HapticButton>

        <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">
          or invite via link
        </div>

        <HapticButton
          onClick={invite}
          loading={copying}
          loadingText="Copied!"
          className="btn-primary w-full gap-2 text-[15px]"
        >
          <LinkIcon className="h-4 w-4 shrink-0" />
          Share Invite Link
        </HapticButton>

        <p className="mt-3 text-center text-[12px] text-[var(--muted)]">
          Anyone with the link can join without signing up.
        </p>
      </div>
    </main>
  );
}
