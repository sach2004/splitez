"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserRoundPlus, ReceiptText, ArrowRight } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { money, initials } from "@/lib/utils";
import type { MemberBalance, Debt } from "@/lib/balance";

type TMember  = { id: string; name: string };
type TExpense = { id: string; description: string; amount: number; splitMode: string; itemCount: number; date: string; payerName: string | null };

export default function GroupTabs({
  groupId, currency, members, expenses, balances, debts,
}: {
  groupId: string; currency: string; members: TMember[]; expenses: TExpense[]; balances: MemberBalance[]; debts: Debt[];
}) {
  const [tab, setTab] = useState<"activity" | "balance" | "summary" | "members">("activity");
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function delExpense(id: string) {
    if (deleting) return;
    const ok = await confirmDialog({ title: "Delete expense?", message: "This can't be undone.", confirmText: "Delete", danger: true });
    if (!ok) return;
    haptic([15, 30, 15]);
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Expense deleted", "success");
      router.refresh();
    } catch {
      toast("Failed to delete expense", "error");
    } finally {
      setDeleting(null);
    }
  }

  const tabs = [["activity", "Activity"], ["balance", "Balance"], ["summary", "Summary"], ["members", "Members"]] as const;

  return (
    <>
      <div className="no-scrollbar mt-5 flex gap-6 overflow-x-auto border-b border-[var(--line)] text-[15px]">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => { haptic(); setTab(id); }}
            className={["shrink-0 pb-3 font-black transition-colors", tab === id ? "border-b-[2.5px] border-mint-700 text-mint-700" : "text-[var(--muted)]"].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {/* ACTIVITY */}
      {tab === "activity" && (
        expenses.length === 0 ? (
          <Empty label="No expenses yet" sub='Tap "Add expense" below' />
        ) : (
          <div className="stagger mt-5 space-y-2.5">
            {expenses.map((e) => (
              <div key={e.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-black leading-snug">{e.description}</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {e.payerName ? `${e.payerName} paid · ` : ""}
                      {e.splitMode === "EQUAL" ? "split equally" : `${e.itemCount} item${e.itemCount !== 1 ? "s" : ""}`}
                      {" · "}{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-[16px] font-black text-mint-700">{money(e.amount, currency)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <HapticLink href={`/expense/${e.id}/edit`} className="flex items-center gap-1.5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[12px] font-black text-[var(--foreground)]">
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </HapticLink>
                  <button onClick={() => delExpense(e.id)} disabled={deleting === e.id}
                    className="tap-scale flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-black text-red-600 disabled:opacity-50 dark:bg-red-950/20">
                    {deleting === e.id ? <span className="spinner spinner-dark h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    {deleting === e.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* BALANCE */}
      {tab === "balance" && (
        <div className="stagger mt-5 space-y-2">
          {balances.map((b) => {
            const settled = Math.abs(b.net) < 0.01;
            return (
              <div key={b.memberId} className="app-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--soft)] text-[14px] font-black text-mint-700">{initials(b.name)}</span>
                  <span className="text-[15px] font-black">{b.name}</span>
                </div>
                <div className="text-right">
                  {settled ? <span className="text-[14px] font-black text-[var(--muted)]">settled up</span>
                    : b.net > 0 ? (<><div className="text-[15px] font-black text-mint-600">+{money(b.net, currency)}</div><div className="text-[11px] text-[var(--muted)]">gets back</div></>)
                    : (<><div className="text-[15px] font-black text-red-500">{money(b.net, currency)}</div><div className="text-[11px] text-[var(--muted)]">owes</div></>)}
                </div>
              </div>
            );
          })}
          {members.length < 2 && (
            <p className="px-1 pt-1 text-[12px] text-[var(--muted)]">Add more people (Members tab) and an expense to see balances.</p>
          )}
        </div>
      )}

      {/* SUMMARY */}
      {tab === "summary" && (
        debts.length === 0 ? (
          <Empty label="All settled up 🎉" sub={members.length < 2 ? "Add people and an expense first" : "No one owes anyone right now"} />
        ) : (
          <div className="stagger mt-5 space-y-2">
            {debts.map((d, i) => (
              <div key={i} className="app-card flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2 text-[15px] font-black">
                  <span>{d.fromName}</span><ArrowRight className="h-4 w-4 text-mint-600" /><span>{d.toName}</span>
                </div>
                <span className="shrink-0 text-[15px] font-black text-mint-700">{money(d.amount, currency)}</span>
              </div>
            ))}
            <p className="px-1 pt-1 text-[12px] text-[var(--muted)]">Each person pays the bill payer their share of what they shared.</p>
          </div>
        )
      )}

      {/* MEMBERS */}
      {tab === "members" && (
        <div className="mt-5">
          <div className="stagger space-y-2">
            {members.map((m) => (
              <div key={m.id} className="app-card flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--soft)] text-[14px] font-black text-mint-700">{initials(m.name)}</span>
                <span className="text-[15px] font-black">{m.name}</span>
              </div>
            ))}
          </div>
          <HapticLink href={`/groups/${groupId}/add-member`} className="mt-3 flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line)] py-3.5 text-[14px] font-black text-mint-700">
            <UserRoundPlus className="h-4 w-4" />Add / invite people
          </HapticLink>
        </div>
      )}
    </>
  );
}

function Empty({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="animate-in flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-mint-50 text-mint-600 dark:bg-mint-900/20"><ReceiptText className="h-9 w-9" strokeWidth={2.2} /></div>
      <div><h2 className="text-[22px] font-black tracking-[-.03em]">{label}</h2><p className="mt-1 text-[15px] text-[var(--muted)]">{sub}</p></div>
    </div>
  );
}
