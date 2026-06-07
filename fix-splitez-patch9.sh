#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch9.sh  —  Run from project root
#
#   1. (Explained) "settled up" is correct with 0/1 members — point 4 unblocks it
#   2. Loaders everywhere: global nav progress bar on every navigation +
#      spinners on every async action button (delete, add, etc.)
#   3. No more ugly alert()/confirm(): themed toast + themed confirm dialog
#   4. Instant "add member" inside the Split-between picker
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

# =============================================================================
# lib/toast.ts + lib/confirm.ts
# =============================================================================
info "Creating lib/toast.ts + lib/confirm.ts..."
cat > lib/toast.ts << 'TS'
export type ToastType = "success" | "error" | "info";
export function toast(message: string, type: ToastType = "info") {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type, id: Date.now() + Math.random() } })
  );
}
TS

cat > lib/confirm.ts << 'TS'
type Opts = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
export function confirmDialog(opts: Opts): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    document.dispatchEvent(new CustomEvent("app:confirm", { detail: { ...opts, resolve } }));
  });
}
TS
ok "toast + confirm helpers created"

# =============================================================================
# components/Toaster.tsx
# =============================================================================
info "Creating components/Toaster.tsx..."
cat > components/Toaster.tsx << 'TSX'
"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type T = { id: number; message: string; type: "success" | "error" | "info" };

export default function Toaster() {
  const [toasts, setToasts] = useState<T[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as T;
      setToasts((v) => [...v, d]);
      setTimeout(() => setToasts((v) => v.filter((t) => t.id !== d.id)), 3200);
    };
    document.addEventListener("app:toast", handler);
    return () => document.removeEventListener("app:toast", handler);
  }, []);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
TSX
ok "Toaster.tsx created"

# =============================================================================
# components/ConfirmDialog.tsx
# =============================================================================
info "Creating components/ConfirmDialog.tsx..."
cat > components/ConfirmDialog.tsx << 'TSX'
"use client";
import { useEffect, useState } from "react";

type State = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  resolve: (b: boolean) => void;
} | null;

export default function ConfirmDialog() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    const handler = (e: Event) => setState((e as CustomEvent).detail);
    document.addEventListener("app:confirm", handler);
    return () => document.removeEventListener("app:confirm", handler);
  }, []);

  if (!state) return null;
  const close = (v: boolean) => { state.resolve(v); setState(null); };

  return (
    <div className="animate-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-6" onClick={() => close(false)}>
      <div className="animate-in w-full max-w-[340px] rounded-[20px] bg-[var(--card)] p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-black tracking-tight">{state.title}</h3>
        {state.message && <p className="mt-1.5 text-[14px] leading-5 text-[var(--muted)]">{state.message}</p>}
        <div className="mt-5 flex gap-2.5">
          <button onClick={() => close(false)} className="btn-secondary tap-scale flex-1 text-[14px]">
            {state.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            className={`tap-scale flex-1 rounded-[14px] py-3 text-[14px] font-black text-white ${state.danger ? "bg-red-500" : "bg-mint-600"}`}
          >
            {state.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
TSX
ok "ConfirmDialog.tsx created"

# =============================================================================
# components/NavProgress.tsx — global loading bar on every navigation
# =============================================================================
info "Creating components/NavProgress.tsx..."
cat > components/NavProgress.tsx << 'TSX'
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the bar when any HapticLink fires "nav:start"
  useEffect(() => {
    const start = () => {
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      // safety: never get stuck on
      timer.current = setTimeout(() => setActive(false), 8000);
    };
    document.addEventListener("nav:start", start);
    return () => document.removeEventListener("nav:start", start);
  }, []);

  // Complete when the route actually changes
  useEffect(() => {
    setActive(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname]);

  return <div className={`nav-progress ${active ? "nav-progress-on" : ""}`} aria-hidden />;
}
TSX
ok "NavProgress.tsx created"

# =============================================================================
# components/Providers.tsx — mount global UI
# =============================================================================
info "Rewriting components/Providers.tsx..."
cat > components/Providers.tsx << 'TSX'
"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import Toaster from "@/components/Toaster";
import ConfirmDialog from "@/components/ConfirmDialog";
import NavProgress from "@/components/NavProgress";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        {children}
        <NavProgress />
        <Toaster />
        <ConfirmDialog />
      </ThemeProvider>
    </SessionProvider>
  );
}
TSX
ok "Providers.tsx rewritten"

# =============================================================================
# components/HapticLink.tsx — fire nav:start so the bar shows on every nav
# =============================================================================
info "Rewriting components/HapticLink.tsx..."
cat > components/HapticLink.tsx << 'TSX'
"use client";
import Link, { type LinkProps } from "next/link";
import * as React from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type HapticLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  hapticFeedback?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function HapticLink({ children, className, hapticFeedback = true, onClick, ...props }: HapticLinkProps) {
  return (
    <Link
      {...props}
      className={cn("tap-scale", className)}
      onClick={(event) => {
        if (hapticFeedback) haptic();
        // Trigger the global navigation progress bar
        if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey) {
          try { document.dispatchEvent(new Event("nav:start")); } catch (_) {}
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
TSX
ok "HapticLink.tsx rewritten"

# =============================================================================
# components/DeleteGroupButton.tsx — themed confirm + spinner
# =============================================================================
info "Rewriting components/DeleteGroupButton.tsx..."
cat > components/DeleteGroupButton.tsx << 'TSX'
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
TSX
ok "DeleteGroupButton.tsx rewritten"

# =============================================================================
# components/ShareButton.tsx — toast instead of prompt
# =============================================================================
info "Rewriting components/ShareButton.tsx..."
cat > components/ShareButton.tsx << 'TSX'
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
TSX
ok "ShareButton.tsx rewritten"

# =============================================================================
# components/GroupTabs.tsx — themed confirm/toast + delete spinner
# =============================================================================
info "Rewriting components/GroupTabs.tsx..."
cat > components/GroupTabs.tsx << 'TSX'
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
TSX
ok "GroupTabs.tsx rewritten"

# =============================================================================
# components/ExpenseForm.tsx — toast + instant add-member in members sheet
# =============================================================================
info "Rewriting components/ExpenseForm.tsx (instant add-member + toasts)..."
cat > components/ExpenseForm.tsx << 'TSX'
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Car, Clapperboard, Fuel, Hotel, ImagePlus, ReceiptText, ShoppingCart,
  Utensils, Zap, Shapes, X, ChevronDown, Check, UserRoundPlus,
} from "lucide-react";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { uuid } from "@/lib/uuid";
import { toast } from "@/lib/toast";
import { money, initials } from "@/lib/utils";

type Group  = { id: string; name: string; members: { id: string; name: string }[] };
type Member = { id: string; name: string };
type Item   = { id: string; name: string; price: number; memberIds: string[] };

type EditData = {
  id: string; groupId: string; description: string; amount: string; category: string;
  splitMode: "EQUAL" | "UNEQUAL"; date: string; items: Item[]; includedIds: string[];
};

const cats = [
  ["FOOD", "Food", Utensils], ["TRAVEL", "Travel", Car], ["HOTEL", "Hotel", Hotel],
  ["FUN", "Fun", Clapperboard], ["GROCERIES", "Groceries", ShoppingCart],
  ["FUEL", "Fuel", Fuel], ["UTILITIES", "Utilities", Zap], ["OTHER", "Other", Shapes],
] as const;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{children}</p>;
}
function PillBtn({ onClick, children, className = "" }: { onClick: () => void; children: React.ReactNode; className?: string }) {
  return <HapticButton onClick={onClick} className={`flex h-[38px] items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-black ${className}`}>{children}</HapticButton>;
}

export default function ExpenseForm({ groups, edit }: { groups: Group[]; edit?: EditData }) {
  const params  = useSearchParams();
  const router  = useRouter();
  const initial = edit?.groupId || params.get("groupId") || groups[0]?.id || "";

  const [groupId,     setGroupId]     = useState(initial);
  const [amount,      setAmount]      = useState(edit?.amount ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [category,    setCategory]    = useState(edit?.category ?? "FOOD");
  const [splitMode,   setSplitMode]   = useState<"EQUAL" | "UNEQUAL">(edit?.splitMode ?? "EQUAL");
  const [date,        setDate]        = useState(edit?.date ?? new Date().toISOString().slice(0, 10));
  const [sheet,       setSheet]       = useState<"group" | "members" | "split" | "paid" | null>(null);
  const [items,       setItems]       = useState<Item[]>(edit?.items ?? []);
  const [includedIds, setIncludedIds] = useState<string[]>(edit?.includedIds ?? []);
  const [loadingAi,   setLoadingAi]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Local member list so we can add members instantly without reloading the form
  const group = groups.find((g) => g.id === groupId);
  const [members, setMembers] = useState<Member[]>(group?.members ?? []);
  const [memberName, setMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Reset member list when the selected group changes
  useEffect(() => {
    const g = groups.find((x) => x.id === groupId);
    setMembers(g?.members ?? []);
  }, [groupId, groups]);

  const allMembers = members;
  useEffect(() => {
    setIncludedIds((prev) => (prev.length ? prev : allMembers.map((m) => m.id)));
  }, [allMembers]);

  const selectedMembers = allMembers.filter((m) => includedIds.includes(m.id));

  useEffect(() => {
    if (splitMode === "UNEQUAL" && items.length > 0) {
      const total = items.reduce((s, i) => s + i.price, 0);
      if (total > 0) setAmount(total.toFixed(2));
    }
  }, [items, splitMode]);

  const splitLabel = splitMode === "EQUAL" ? "Equally" : "By item";

  function toggleIncluded(id: string) {
    setIncludedIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }

  async function addMember() {
    const name = memberName.trim();
    if (!name) return toast("Enter a name", "error");
    if (addingMember || !groupId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuest: true, name, guestSessionId: getGuestSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      setMembers((v) => [...v, { id: data.id, name: data.name }]);
      setIncludedIds((v) => [...v, data.id]);
      setMemberName("");
      toast(`${data.name} added`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Failed to add member", "error");
    } finally {
      setAddingMember(false);
    }
  }

  async function parseReceipt(file: File) {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/receipt/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast(data?.error || "Receipt parsing failed", "error"); return; }
      setItems((data.items || []).map((x: { name?: string; price?: number }, i: number) => ({
        id: uuid(), name: x.name || `Item ${i + 1}`, price: Number(x.price || 0), memberIds: [...includedIds],
      })));
      setSplitMode("UNEQUAL");
      toast("Bill scanned", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Receipt parsing failed", "error");
    } finally { setLoadingAi(false); }
  }

  function setAll(itemId: string, all: boolean) {
    setItems((v) => v.map((i) => (i.id === itemId ? { ...i, memberIds: all ? [...includedIds] : [] } : i)));
  }
  function toggle(itemId: string, memberId: string) {
    setItems((v) => v.map((i) => i.id === itemId ? {
      ...i, memberIds: i.memberIds.includes(memberId) ? i.memberIds.filter((x) => x !== memberId) : [...i.memberIds, memberId],
    } : i));
  }

  const shares = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of selectedMembers) out[m.id] = 0;
    if (splitMode === "EQUAL") {
      const each = Number(amount || 0) / (selectedMembers.length || 1);
      for (const m of selectedMembers) out[m.id] = each;
    } else {
      for (const i of items) {
        const sharers = i.memberIds.filter((id) => includedIds.includes(id));
        const each = i.price / (sharers.length || 1);
        for (const id of sharers) out[id] = (out[id] || 0) + each;
      }
    }
    return out;
  }, [amount, items, selectedMembers, splitMode, includedIds]);

  async function save() {
    if (saving) return;
    if (!groupId) return toast("Select a group first", "error");
    if (!(Number(amount) > 0)) return toast("Enter an amount greater than zero", "error");
    if (selectedMembers.length === 0) return toast("Pick at least one member", "error");
    setSaving(true);
    try {
      const cleanItems = items.map((i) => ({ ...i, memberIds: i.memberIds.filter((id) => includedIds.includes(id)) }));
      const url    = edit ? `/api/expenses/${edit.id}` : "/api/expenses";
      const method = edit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId, description: description || "Expense", amount: Number(amount),
          category, splitMode, date, guestSessionId: getGuestSessionId(),
          items: splitMode === "UNEQUAL" ? cleanItems : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast(edit ? "Expense updated" : "Expense saved", "success");
      router.push(`/groups/${groupId}`);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        {/* Top bar */}
        <div className="flex items-center gap-2">
          <HapticButton onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--soft)]" aria-label="Close"><X className="h-5 w-5" /></HapticButton>
          <h1 className="flex-1 text-[19px] font-black tracking-tight">{edit ? "Edit expense" : "Add expense"}</h1>
          {!edit && (
            <PillBtn onClick={() => setSheet("group")} className="max-w-[110px] bg-red-50 text-red-700 dark:bg-red-950/30">
              <span className="truncate">{group?.name || "Pick group"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </PillBtn>
          )}
          <HapticButton onClick={save} loading={saving} loadingText="Saving" spinnerDark className="text-[15px] font-black text-mint-700">Save</HapticButton>
        </div>

        {/* Split between */}
        <div className="mt-6 flex items-center gap-2.5 text-[14px] text-[var(--muted)]">
          <span>Split between</span>
          <PillBtn onClick={() => setSheet("members")} className="bg-[var(--soft)] text-[var(--foreground)]">
            <span>{selectedMembers.length ? `${selectedMembers.length} member${selectedMembers.length !== 1 ? "s" : ""}` : "Pick members"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </PillBtn>
        </div>

        {/* Amount */}
        <div className="mt-6">
          <Label>Amount</Label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"
            disabled={splitMode === "UNEQUAL" && items.length > 0}
            className="input-field h-[62px] px-5 text-[34px] font-semibold tracking-tight disabled:opacity-70" />
          {splitMode === "UNEQUAL" && items.length > 0 && <p className="mt-1.5 text-[12px] text-[var(--muted)]">Total is calculated from the items below.</p>}
        </div>

        {/* Description */}
        <div className="mt-4"><Label>Description</Label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="input-field h-[50px] px-4 text-[15px]" /></div>

        {/* Paid by / Split */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><Label>Paid by</Label><PillBtn onClick={() => setSheet("paid")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]"><span>You</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></PillBtn></div>
          <div><Label>Split</Label><PillBtn onClick={() => setSheet("split")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]"><span>{splitLabel}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></PillBtn></div>
        </div>

        {/* Date */}
        <div className="mt-4"><Label>Date</Label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field h-[50px] px-4 text-[15px]" /></div>

        {/* Category */}
        <div className="mt-4"><Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {cats.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setCategory(id)}
                className={["tap-scale flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-black transition-colors",
                  category === id ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-[var(--soft)] text-[var(--muted)]"].join(" ")}>
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div className="app-card mt-5 p-4">
          <div className="mb-3 flex items-center gap-2 text-[14px] font-black"><ReceiptText className="h-4 w-4 text-mint-600" />Or scan the bill (optional)</div>
          <label className={["tap-scale flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[13px] border border-[var(--line)] bg-[var(--soft)] text-[14px] font-black text-mint-700", loadingAi ? "pointer-events-none opacity-60" : ""].join(" ")}>
            {loadingAi ? <><span className="spinner spinner-dark" />Scanning…</> : <><ImagePlus className="h-4 w-4" />Upload bill image</>}
            <input type="file" accept="image/*" hidden disabled={loadingAi} onChange={(e) => e.target.files?.[0] && parseReceipt(e.target.files[0])} />
          </label>
          <p className="mt-2 text-[11px] text-[var(--muted)]">We&apos;ll read the items so you can assign them per person.</p>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="stagger mt-5 space-y-2">
            <h2 className="text-[19px] font-black tracking-tight">Items — tap who shares each</h2>
            {items.map((i) => (
              <div key={i.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3 text-[14px] font-black"><span>{i.name}</span><span className="shrink-0">{money(i.price)}</span></div>
                <div className="my-2 flex gap-2">
                  <button onClick={() => setAll(i.id, true)} className="tap-scale rounded-full bg-mint-50 px-3 py-1.5 text-[11px] font-black text-mint-700">All</button>
                  <button onClick={() => setAll(i.id, false)} className="tap-scale rounded-full bg-[var(--soft)] px-3 py-1.5 text-[11px] font-black text-[var(--muted)]">None</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((m) => (
                    <button key={m.id} onClick={() => toggle(i.id, m.id)}
                      className={["tap-scale rounded-full px-3 py-1.5 text-[11px] font-black transition-colors", i.memberIds.includes(m.id) ? "bg-mint-700 text-white" : "bg-[var(--soft)] text-[var(--muted)]"].join(" ")}>{m.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {selectedMembers.length > 0 && (
          <div className="app-card mt-4 p-4">
            <h2 className="mb-2 text-[15px] font-black">Who owes what</h2>
            {selectedMembers.map((m) => (
              <div key={m.id} className="flex justify-between border-b border-[var(--line)] py-2 text-[13px] last:border-0"><span className="text-[var(--muted)]">{m.name}</span><b>{money(shares[m.id] || 0)}</b></div>
            ))}
          </div>
        )}
      </div>

      {/* Sheets */}
      {sheet && (
        <div className="animate-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/55" onClick={() => setSheet(null)}>
          <div className="animate-sheet w-full max-w-[430px] rounded-t-[22px] bg-[var(--card)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,.18)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--line)]" />

            {sheet === "members" && (
              <>
                <h2 className="text-[20px] font-black">Split between</h2>
                <p className="mt-1 text-[13px] text-[var(--muted)]">Tap to include / exclude people</p>

                {/* Instant add member */}
                <div className="mt-4 flex gap-2">
                  <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Add someone by name"
                    onKeyDown={(e) => e.key === "Enter" && addMember()}
                    className="input-field h-[46px] flex-1 px-3 text-[14px]" />
                  <HapticButton onClick={addMember} loading={addingMember} loadingText="" spinnerDark className="btn-secondary gap-1.5 px-4 text-[14px]">
                    <UserRoundPlus className="h-4 w-4" />Add
                  </HapticButton>
                </div>

                <div className="mt-3 space-y-2">
                  {allMembers.length ? allMembers.map((m) => {
                    const on = includedIds.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => toggleIncluded(m.id)}
                        className={["tap-scale flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left", on ? "bg-mint-50 dark:bg-mint-900/20" : "bg-[var(--soft)]"].join(" ")}>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--card)] text-[13px] font-black text-mint-700">{initials(m.name)}</span>
                        <span className="flex-1 text-[15px] font-black">{m.name}</span>
                        <span className={["grid h-6 w-6 place-items-center rounded-full border-2", on ? "border-mint-600 bg-mint-600 text-white" : "border-[var(--line)]"].join(" ")}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                      </button>
                    );
                  }) : <p className="text-[13px] text-[var(--muted)]">No members yet — add someone above.</p>}
                </div>
              </>
            )}

            {sheet === "split" && (
              <>
                <h2 className="text-[22px] font-black tracking-tight">How to split?</h2>
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-[14px] bg-[var(--soft)] p-1">
                  {([["EQUAL", "Equally"], ["UNEQUAL", "By item"]] as const).map(([v, lbl]) => (
                    <button key={v} onClick={() => setSplitMode(v)} className={["tap-scale rounded-[11px] py-2.5 text-[13px] font-black transition-colors", splitMode === v ? "bg-[var(--card)] text-mint-700 shadow-sm" : "text-[var(--muted)]"].join(" ")}>{lbl}</button>
                  ))}
                </div>
                <p className="mt-3 text-center text-[13px] leading-5 text-[var(--muted)]">{splitMode === "EQUAL" ? `Split equally among ${selectedMembers.length} people.` : "Assign each item to the people who shared it."}</p>
              </>
            )}

            {sheet === "group" && (
              <>
                <h2 className="text-[20px] font-black">Select group</h2>
                <div className="mt-4 space-y-2">
                  {groups.length ? groups.map((g) => (
                    <button key={g.id} onClick={() => { setGroupId(g.id); setItems([]); setSheet(null); }} className={["tap-scale w-full rounded-[13px] px-4 py-3 text-left text-[14px] font-black", g.id === groupId ? "bg-mint-50 text-mint-700 dark:bg-mint-900/20" : "bg-[var(--soft)] text-[var(--foreground)]"].join(" ")}>{g.name}</button>
                  )) : <p className="text-[13px] text-[var(--muted)]">No groups yet.</p>}
                </div>
              </>
            )}

            {sheet === "paid" && (<><h2 className="text-[20px] font-black">Paid by</h2><div className="mt-3 rounded-[13px] bg-mint-50 px-4 py-3 dark:bg-mint-900/20"><p className="text-[14px] font-black text-mint-700">You</p></div></>)}

            <button onClick={() => setSheet(null)} className="btn-primary tap-scale mt-5 w-full text-[14px]">Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
TSX
ok "ExpenseForm.tsx rewritten"

# =============================================================================
# Replace alert() with toast in the remaining client pages
# =============================================================================
info "Updating app/groups/new/page.tsx..."
mkdir -p "app/groups/new"
cat > "app/groups/new/page.tsx" << 'TSX'
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
TSX
ok "new group page updated"

info "Updating app/join/[groupId]/page.tsx..."
mkdir -p "app/join/[groupId]"
cat > "app/join/[groupId]/page.tsx" << 'TSX'
"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { toast } from "@/lib/toast";

export default function Join({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function join() {
    const trimmed = name.trim();
    if (!trimmed) return toast("Enter your name", "error");
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuest: true, name: trimmed, guestSessionId: getGuestSessionId() }),
      });
      if (!res.ok) throw new Error("Failed to join");
      toast("Joined!", "success");
      router.push(`/groups/${groupId}`);
    } catch {
      toast("Failed to join group", "error");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Join group</h1>
        <p className="mt-3 text-[15px] text-[var(--muted)]">Enter your name to join as a guest — no sign-up needed.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={loading} className="input-field mt-7 h-[52px] px-4" autoFocus onKeyDown={(e) => e.key === "Enter" && join()} />
        <HapticButton onClick={join} loading={loading} loadingText="Joining…" className="btn-primary mt-5 w-full text-[15px]">Join Group</HapticButton>
      </div>
    </main>
  );
}
TSX
ok "join page updated"

info "Updating app/groups/[groupId]/add-member/page.tsx..."
mkdir -p "app/groups/[groupId]/add-member"
cat > "app/groups/[groupId]/add-member/page.tsx" << 'TSX'
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
TSX
ok "add-member page updated"

info "Updating app/login/page.tsx + app/signup/page.tsx..."
cat > app/login/page.tsx << 'TSX'
"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";
import { toast } from "@/lib/toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "creds" | null>(null);

  async function loginCreds() {
    if (loading) return;
    if (!email.trim()) return toast("Enter your email", "error");
    if (!password) return toast("Enter your password", "error");
    setLoading("creds");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) { toast("Wrong email or password", "error"); setLoading(null); return; }
    window.location.href = "/dashboard";
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Welcome back</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Sign in to your account</p>
        <HapticButton onClick={() => { if (loading) return; setLoading("google"); signIn("google", { callbackUrl: "/dashboard" }); }} loading={loading === "google"} loadingText="Opening Google…" spinnerDark className="btn-secondary mt-8 w-full text-[15px]">Continue with Google</HapticButton>
        <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">or</div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" autoCapitalize="none" disabled={loading === "creds"} className="input-field h-[52px] px-4" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" disabled={loading === "creds"} className="input-field mt-3 h-[52px] px-4" onKeyDown={(e) => e.key === "Enter" && loginCreds()} />
        <HapticButton onClick={loginCreds} loading={loading === "creds"} loadingText="Logging in…" className="btn-primary mt-5 w-full text-[15px]">Login</HapticButton>
        <Link href="/signup" className="mt-5 block text-center text-[14px] font-black text-mint-700">Don&apos;t have an account? Sign up</Link>
      </div>
    </main>
  );
}
TSX

cat > app/signup/page.tsx << 'TSX'
"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { HapticButton } from "@/components/HapticButton";
import { toast } from "@/lib/toast";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    if (!name.trim()) return toast("Enter your name", "error");
    if (!email.trim()) return toast("Enter your email", "error");
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await r.json();
      if (!r.ok) { toast(data.error || "Signup failed", "error"); setLoading(false); return; }
      await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
    } catch {
      toast("Something went wrong. Try again.", "error");
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content pt-16">
        <h1 className="page-title">Create account</h1>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Split expenses with friends</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoCapitalize="words" disabled={loading} className="input-field mt-8 h-[52px] px-4" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" autoCapitalize="none" disabled={loading} className="input-field mt-3 h-[52px] px-4" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" disabled={loading} className="input-field mt-3 h-[52px] px-4" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <HapticButton onClick={submit} loading={loading} loadingText="Creating account…" className="btn-primary mt-5 w-full text-[15px]">Create Account</HapticButton>
        <Link href="/login" className="mt-5 block text-center text-[14px] font-black text-mint-700">Already have an account? Login</Link>
      </div>
    </main>
  );
}
TSX
ok "login + signup updated"

# =============================================================================
# globals.css — toast / nav-progress styles (guarded)
# =============================================================================
info "Adding toast + nav-progress styles to globals.css..."
if ! grep -q "UI-BLOCK" app/globals.css; then
cat >> app/globals.css << 'CSS'

/* ===== UI-BLOCK : toasts + navigation progress bar ===== */
.toast-wrap {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  left: 0; right: 0;
  z-index: 200;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 0 16px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 8px;
  width: 100%; max-width: 400px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px; font-weight: 800;
  background: var(--card); color: var(--foreground);
  border: 1px solid var(--line);
  box-shadow: 0 12px 32px rgba(0,0,0,.16);
  animation: toastIn .28s cubic-bezier(.2,.8,.2,1) both;
}
.toast-success { border-left: 4px solid #11ad93; }
.toast-success svg { color: #11ad93; }
.toast-error { border-left: 4px solid #ef4444; }
.toast-error svg { color: #ef4444; }
.toast-info svg { color: var(--muted); }
@keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }

.nav-progress {
  position: fixed; top: 0; left: 0;
  height: 3px; width: 0;
  z-index: 300;
  background: linear-gradient(90deg, var(--mint), var(--mint2));
  border-radius: 0 3px 3px 0;
  opacity: 0;
  transition: opacity .2s ease;
}
.nav-progress-on {
  width: 92%;
  opacity: 1;
  transition: width 9s cubic-bezier(.05,.7,.1,1), opacity .15s ease;
}
CSS
fi
ok "globals.css updated"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 9 done!                                                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  1. 'Settled up' is CORRECT with 0/1 members. Add people +     ║${NC}"
echo -e "${GREEN}║     an expense and Balance/Summary fill in. (Instant add =     ║${NC}"
echo -e "${GREEN}║     point 4 below.)                                            ║${NC}"
echo -e "${GREEN}║  2. Loaders everywhere:                                        ║${NC}"
echo -e "${GREEN}║     ✔ Global nav progress bar on EVERY navigation (tap a       ║${NC}"
echo -e "${GREEN}║       group/expense/back → thin bar at top while it loads)     ║${NC}"
echo -e "${GREEN}║     ✔ Spinners on delete, add-member, share, save, login…      ║${NC}"
echo -e "${GREEN}║  3. No more alert()/confirm(): themed toasts (top) + themed     ║${NC}"
echo -e "${GREEN}║     confirm dialog for deletes.                                ║${NC}"
echo -e "${GREEN}║  4. Instant 'add member' input inside the Split-between sheet.  ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Restart:  npm run dev                                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
