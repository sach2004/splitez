"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { shareOrCopy } from "@/lib/share";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";

export default function ShareButton({ groupId }: { groupId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onShare() {
    if (busy) return;
    haptic();
    setBusy(true);
    const url = `${window.location.origin}/join/${groupId}`;
    const result = await shareOrCopy(url, "Join my group on SplitEZ");
    setBusy(false);
    if (result === "copied" || result === "shared") {
      setDone(true);
      toast(result === "shared" ? "Shared!" : "Invite link copied", "success");
      setTimeout(() => setDone(false), 1800);
    } else {
      toast(`Couldn't copy — link: ${url}`, "info");
    }
  }

  return (
    <button
      onClick={onShare}
      disabled={busy}
      className="tap-scale flex h-12 w-full items-center gap-3.5 rounded-[13px] px-1 text-[16px] font-semibold text-[var(--foreground)] hover:bg-[var(--soft)] disabled:opacity-60"
    >
      {busy ? (
        <span className="spinner spinner-dark" />
      ) : done ? (
        <Check className="h-[18px] w-[18px] text-mint-600" />
      ) : (
        <Share2 className="h-[18px] w-[18px] text-mint-600" />
      )}
      {done ? "Invite link copied!" : "Share group / invite people"}
    </button>
  );
}
