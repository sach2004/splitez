"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { shareOrCopy } from "@/lib/share";
import { haptic } from "@/lib/haptics";

export default function ShareButton({ groupId }: { groupId: string }) {
  const [done, setDone] = useState(false);

  async function onShare() {
    haptic();
    const url = `${window.location.origin}/join/${groupId}`;
    const result = await shareOrCopy(url, "Join my group on SplitEZ");
    if (result === "copied" || result === "shared") {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } else {
      // last-ditch fallback: show the link
      prompt("Copy this link to invite people:", url);
    }
  }

  return (
    <button
      onClick={onShare}
      className="tap-scale flex h-12 w-full items-center gap-3.5 rounded-[13px] px-1 text-[16px] font-semibold text-[var(--foreground)] hover:bg-[var(--soft)]"
    >
      {done ? (
        <>
          <Check className="h-[18px] w-[18px] text-mint-600" />
          Invite link copied!
        </>
      ) : (
        <>
          <Share2 className="h-[18px] w-[18px] text-mint-600" />
          Share group / invite people
        </>
      )}
    </button>
  );
}
