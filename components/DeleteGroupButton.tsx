"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function del() {
    if (busy) return;
    const ok = await confirmDialog({
      title: "Delete this group?",
      message: "All its expenses will be removed. This can't be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    haptic([20, 40, 20]);
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Group deleted", "success");
      router.push("/groups");
    } catch {
      toast("Failed to delete group", "error");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="tap-scale flex h-12 w-full items-center gap-3.5 rounded-[13px] px-1 text-[16px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/20"
    >
      {busy ? <span className="spinner spinner-dark" /> : <Trash2 className="h-[18px] w-[18px]" />}
      {busy ? "Deleting…" : "Delete group"}
    </button>
  );
}
