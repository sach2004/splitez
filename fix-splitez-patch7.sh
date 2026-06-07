#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch7.sh  —  Run from project root
#
# Adds:
#   1. Edit a saved expense (reopen to edit)
#   2. Working Balance / Summary / Members tabs in a group
#   3. Delete group + delete expense
#   4. Rename "Splitwell" -> "SplitEZ" everywhere
#   5. Smooth animations throughout
#   6. Recent activity (dashboard) + Activity page show real data
#   + Fixes the deployment build error (old group:{update} route)
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

# =============================================================================
# 4. Rename Splitwell -> SplitEZ across all source (sed)
# =============================================================================
info "Renaming 'Splitwell' -> 'SplitEZ' across source..."
FILES=$(grep -rl "Splitwell" app components lib 2>/dev/null || true)
if [[ -n "$FILES" ]]; then
  echo "$FILES" | while read -r f; do
    [[ -n "$f" ]] && sed -i.bak 's/Splitwell/SplitEZ/g' "$f" && rm -f "$f.bak"
  done
fi
ok "rename done"

# Logo uses 'Split' + 'well' split across a span, so rewrite it explicitly
info "Rewriting components/Logo.tsx..."
cat > components/Logo.tsx << 'TSX'
export default function Logo() {
  return (
    <div className="flex items-center justify-center gap-2.5 pt-1">
      <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-mint-700 text-[22px] font-black leading-none text-white shadow-[0_8px_20px_rgba(0,128,105,.18)]">
        S
      </div>
      <div className="text-[26px] font-black tracking-tight">
        Split<span className="text-mint-500 dark:text-mint-300">EZ</span>
      </div>
    </div>
  );
}
TSX
ok "Logo.tsx rewritten"

# =============================================================================
# 3 + build fix. POST /api/expenses (corrected — fixes the build error)
# =============================================================================
info "Writing corrected app/api/expenses/route.ts (fixes build error)..."
mkdir -p "app/api/expenses"
cat > "app/api/expenses/route.ts" << 'TS'
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, SplitMode } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || null;

    const body = await req.json();
    if (!body.groupId) return NextResponse.json({ error: "Group required" }, { status: 400 });

    const amount = Number(body.amount || 0);
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });

    let date: Date | undefined;
    if (body.date && typeof body.date === "string") {
      const d = new Date(body.date);
      if (!isNaN(d.getTime())) date = d;
    }

    const groupMembers = await prisma.member.findMany({ where: { groupId: body.groupId }, select: { id: true } });
    const validMemberIds = new Set(groupMembers.map((m) => m.id));

    const description = body.description || "Expense";
    const splitMode = (body.splitMode || "EQUAL") as SplitMode;

    // Single atomic nested create — scalar groupId, NO group relation update.
    const expense = await prisma.expense.create({
      data: {
        groupId: body.groupId,
        description,
        amount,
        category: (body.category || "FOOD") as ExpenseCategory,
        splitMode,
        ...(date ? { date } : {}),
        payerUserId: userId,
        payerMemberId: body.payerMemberId || null,
        items: {
          create: (body.items || []).map((item: { name: string; price: number; memberIds?: string[] }) => ({
            name: item.name,
            price: Number(item.price),
            claims: {
              create: (item.memberIds || [])
                .filter((id: string) => validMemberIds.has(id))
                .map((memberId: string) => ({ memberId, claimedBySessionId: body.guestSessionId || null })),
            },
          })),
        },
      },
      include: { items: { include: { claims: true } } },
    });

    prisma.activity
      .create({ data: { groupId: body.groupId, title: `Added ${description}`, body: `${amount.toFixed(2)} split ${splitMode}` } })
      .catch((e) => console.error("[expenses] activity failed:", e));

    return NextResponse.json(expense);
  } catch (err: unknown) {
    console.error("[expenses] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save expense" }, { status: 500 });
  }
}
TS
ok "POST /api/expenses fixed"

# =============================================================================
# 1 + 3. PUT (edit) and DELETE for a single expense
# =============================================================================
info "Creating app/api/expenses/[expenseId]/route.ts (edit + delete)..."
mkdir -p "app/api/expenses/[expenseId]"
cat > "app/api/expenses/[expenseId]/route.ts" << 'TS'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, SplitMode } from "@prisma/client";

export async function PUT(req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  try {
    const { expenseId } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findUnique({ where: { id: expenseId }, select: { groupId: true } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const amount = Number(body.amount || 0);
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });

    let date: Date | undefined;
    if (body.date && typeof body.date === "string") {
      const d = new Date(body.date);
      if (!isNaN(d.getTime())) date = d;
    }

    const groupMembers = await prisma.member.findMany({ where: { groupId: existing.groupId }, select: { id: true } });
    const validMemberIds = new Set(groupMembers.map((m) => m.id));
    const splitMode = (body.splitMode || "EQUAL") as SplitMode;

    // Replace items wholesale: delete old (claims cascade), recreate new.
    await prisma.receiptItem.deleteMany({ where: { expenseId } });

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: body.description || "Expense",
        amount,
        category: (body.category || "FOOD") as ExpenseCategory,
        splitMode,
        ...(date ? { date } : {}),
        items: {
          create: (body.items || []).map((item: { name: string; price: number; memberIds?: string[] }) => ({
            name: item.name,
            price: Number(item.price),
            claims: {
              create: (item.memberIds || [])
                .filter((id: string) => validMemberIds.has(id))
                .map((memberId: string) => ({ memberId, claimedBySessionId: body.guestSessionId || null })),
            },
          })),
        },
      },
      include: { items: { include: { claims: true } } },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[expense PUT] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  try {
    const { expenseId } = await params;
    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[expense DELETE] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete expense" }, { status: 500 });
  }
}
TS
ok "expense edit/delete API created"

# =============================================================================
# 3. DELETE a group
# =============================================================================
info "Creating app/api/groups/[groupId]/route.ts (delete group)..."
mkdir -p "app/api/groups/[groupId]"
cat > "app/api/groups/[groupId]/route.ts" << 'TS'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    // members, expenses, items, claims, activities all cascade per schema
    await prisma.group.delete({ where: { id: groupId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[group DELETE] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete group" }, { status: 500 });
  }
}
TS
ok "group delete API created"

# =============================================================================
# 2. lib/balance.ts — compute net balances + who-owes-whom
# =============================================================================
info "Creating lib/balance.ts..."
cat > lib/balance.ts << 'TS'
export type BMember = { id: string; name: string; userId: string | null };
export type BExpense = {
  amount: number;
  splitMode: string;
  payerUserId: string | null;
  items: { price: number; claims: { memberId: string }[] }[];
};

export type MemberBalance = { memberId: string; name: string; net: number };
export type Debt = { fromName: string; toName: string; amount: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** How much each member owes for a single expense. */
export function sharesFor(e: BExpense, members: BMember[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of members) out[m.id] = 0;

  if (e.splitMode === "EQUAL") {
    const each = e.amount / (members.length || 1);
    for (const m of members) out[m.id] = each;
  } else {
    for (const item of e.items) {
      const claimers = item.claims.map((c) => c.memberId);
      const each = item.price / (claimers.length || 1);
      for (const id of claimers) out[id] = (out[id] || 0) + each;
    }
  }
  return out;
}

function payerMemberId(e: BExpense, members: BMember[]): string | null {
  if (!e.payerUserId) return null;
  return members.find((m) => m.userId === e.payerUserId)?.id ?? null;
}

export function computeBalances(expenses: BExpense[], members: BMember[]) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

  const net: Record<string, number> = {};
  for (const m of members) net[m.id] = 0;
  const pair: Record<string, number> = {}; // `${debtor}|${creditor}` -> amount

  for (const e of expenses) {
    const shares = sharesFor(e, members);
    const payer = payerMemberId(e, members);
    if (payer) net[payer] += e.amount;

    for (const m of members) {
      const s = shares[m.id] || 0;
      if (!s) continue;
      net[m.id] -= s;
      if (payer && m.id !== payer) {
        const k = `${m.id}|${payer}`;
        pair[k] = (pair[k] || 0) + s;
      }
    }
  }

  const balances: MemberBalance[] = members.map((m) => ({ memberId: m.id, name: m.name, net: r2(net[m.id]) }));
  const debts: Debt[] = Object.entries(pair)
    .filter(([, v]) => v > 0.009)
    .map(([k, v]) => {
      const [from, to] = k.split("|");
      return { fromName: nameOf(from), toName: nameOf(to), amount: r2(v) };
    })
    .sort((a, b) => b.amount - a.amount);

  return { balances, debts };
}
TS
ok "lib/balance.ts created"

# =============================================================================
# 2 + 1 + 3. components/GroupTabs.tsx — interactive tabs with edit/delete
# =============================================================================
info "Creating components/GroupTabs.tsx..."
cat > components/GroupTabs.tsx << 'TSX'
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserRoundPlus, ReceiptText, ArrowRight } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
import { haptic } from "@/lib/haptics";
import { money, initials } from "@/lib/utils";
import type { MemberBalance, Debt } from "@/lib/balance";

type TMember  = { id: string; name: string };
type TExpense = { id: string; description: string; amount: number; splitMode: string; itemCount: number; date: string; payerName: string | null };

export default function GroupTabs({
  groupId, currency, members, expenses, balances, debts,
}: {
  groupId: string;
  currency: string;
  members: TMember[];
  expenses: TExpense[];
  balances: MemberBalance[];
  debts: Debt[];
}) {
  const [tab, setTab] = useState<"activity" | "balance" | "summary" | "members">("activity");
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function delExpense(id: string) {
    if (deleting) return;
    if (!confirm("Delete this expense?")) return;
    haptic([15, 30, 15]);
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Failed to delete expense");
    } finally {
      setDeleting(null);
    }
  }

  const tabs = [["activity", "Activity"], ["balance", "Balance"], ["summary", "Summary"], ["members", "Members"]] as const;

  return (
    <>
      {/* Tab bar */}
      <div className="no-scrollbar mt-5 flex gap-6 overflow-x-auto border-b border-[var(--line)] text-[15px]">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => { haptic(); setTab(id); }}
            className={["shrink-0 pb-3 font-black transition-colors", tab === id ? "border-b-[2.5px] border-mint-700 text-mint-700" : "text-[var(--muted)]"].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ACTIVITY ── */}
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
                  <HapticLink
                    href={`/expense/${e.id}/edit`}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[12px] font-black text-[var(--foreground)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </HapticLink>
                  <button
                    onClick={() => delExpense(e.id)}
                    disabled={deleting === e.id}
                    className="tap-scale flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-black text-red-600 disabled:opacity-50 dark:bg-red-950/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />{deleting === e.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── BALANCE ── */}
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
                  {settled ? (
                    <span className="text-[14px] font-black text-[var(--muted)]">settled up</span>
                  ) : b.net > 0 ? (
                    <>
                      <div className="text-[15px] font-black text-mint-600">+{money(b.net, currency)}</div>
                      <div className="text-[11px] text-[var(--muted)]">gets back</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[15px] font-black text-red-500">{money(b.net, currency)}</div>
                      <div className="text-[11px] text-[var(--muted)]">owes</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUMMARY (who pays whom) ── */}
      {tab === "summary" && (
        debts.length === 0 ? (
          <Empty label="All settled up 🎉" sub="No one owes anyone right now" />
        ) : (
          <div className="stagger mt-5 space-y-2">
            {debts.map((d, i) => (
              <div key={i} className="app-card flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2 text-[15px] font-black">
                  <span>{d.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-mint-600" />
                  <span>{d.toName}</span>
                </div>
                <span className="shrink-0 text-[15px] font-black text-mint-700">{money(d.amount, currency)}</span>
              </div>
            ))}
            <p className="px-1 pt-1 text-[12px] text-[var(--muted)]">
              Each person pays the bill payer their share of the items they shared.
            </p>
          </div>
        )
      )}

      {/* ── MEMBERS ── */}
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
          <HapticLink
            href={`/groups/${groupId}/add-member`}
            className="mt-3 flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--line)] py-3.5 text-[14px] font-black text-mint-700"
          >
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
      <div className="grid h-20 w-20 place-items-center rounded-full bg-mint-50 text-mint-600 dark:bg-mint-900/20">
        <ReceiptText className="h-9 w-9" strokeWidth={2.2} />
      </div>
      <div>
        <h2 className="text-[22px] font-black tracking-[-.03em]">{label}</h2>
        <p className="mt-1 text-[15px] text-[var(--muted)]">{sub}</p>
      </div>
    </div>
  );
}
TSX
ok "GroupTabs.tsx created"

# =============================================================================
# 3. components/DeleteGroupButton.tsx
# =============================================================================
info "Creating components/DeleteGroupButton.tsx..."
cat > components/DeleteGroupButton.tsx << 'TSX'
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function del() {
    if (busy) return;
    if (!confirm("Delete this group and ALL its expenses? This can't be undone.")) return;
    haptic([20, 40, 20]);
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/groups");
    } catch {
      alert("Failed to delete group");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="tap-scale flex h-12 w-full items-center gap-3.5 rounded-[13px] px-1 text-[16px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/20"
    >
      <Trash2 className="h-[18px] w-[18px]" />
      {busy ? "Deleting…" : "Delete group"}
    </button>
  );
}
TSX
ok "DeleteGroupButton.tsx created"

# =============================================================================
# 2 + 3. app/groups/[groupId]/page.tsx — compute data, render tabs, delete
# =============================================================================
info "Rewriting app/groups/[groupId]/page.tsx..."
mkdir -p "app/groups/[groupId]"
cat > "app/groups/[groupId]/page.tsx" << 'TSX'
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, UserRoundPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HapticLink } from "@/components/HapticLink";
import ShareButton from "@/components/ShareButton";
import DeleteGroupButton from "@/components/DeleteGroupButton";
import GroupTabs from "@/components/GroupTabs";
import { computeBalances, type BExpense, type BMember } from "@/lib/balance";

export default async function GroupDetail({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      expenses: {
        include: { items: { include: { claims: true } }, payerUser: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!group) notFound();

  const members: BMember[] = group.members.map((m) => ({ id: m.id, name: m.name, userId: m.userId }));

  const bExpenses: BExpense[] = group.expenses.map((e) => ({
    amount: Number(e.amount),
    splitMode: e.splitMode,
    payerUserId: e.payerUserId,
    items: e.items.map((it) => ({ price: Number(it.price), claims: it.claims.map((c) => ({ memberId: c.memberId })) })),
  }));

  const { balances, debts } = computeBalances(bExpenses, members);

  const tabExpenses = group.expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    splitMode: e.splitMode,
    itemCount: e.items.length,
    date: e.date.toISOString(),
    payerName: e.payerUser?.name ?? null,
  }));

  return (
    <main className="app-shell">
      <div className="app-content pb-[calc(320px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HapticLink href="/groups" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--soft)] text-[var(--foreground)]">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </HapticLink>
            <h1 className="max-w-[230px] truncate text-[22px] font-black tracking-[-.03em]">{group.name}</h1>
          </div>
        </div>

        <GroupTabs
          groupId={group.id}
          currency={group.currency}
          members={group.members.map((m) => ({ id: m.id, name: m.name }))}
          expenses={tabExpenses}
          balances={balances}
          debts={debts}
        />
      </div>

      {/* Action sheet */}
      <div className="animate-sheet fixed bottom-0 left-1/2 z-30 w-[min(100vw,430px)] -translate-x-1/2 rounded-t-[22px] border-t border-[var(--line)] bg-[var(--card)] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,.13)] dark:shadow-[0_-8px_30px_rgba(0,0,0,.4)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line)]" />
        <div className="space-y-0.5">
          <SheetLink href={`/expense/new?groupId=${group.id}`} icon={<Plus />} label="Add expense" />
          <SheetLink href={`/groups/${group.id}/add-member`} icon={<UserRoundPlus />} label="Add members" />
          <ShareButton groupId={group.id} />
          <DeleteGroupButton groupId={group.id} />
        </div>
      </div>
    </main>
  );
}

function SheetLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <HapticLink
      href={href}
      className="flex h-12 items-center gap-3.5 rounded-[13px] px-1 text-[16px] font-semibold text-[var(--foreground)] [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-mint-600 hover:bg-[var(--soft)]"
    >
      {icon}{label}
    </HapticLink>
  );
}
TSX
ok "group detail page rewritten"

# =============================================================================
# 1. Edit expense page  + ExpenseForm edit support
# =============================================================================
info "Creating app/expense/[expenseId]/edit/page.tsx..."
mkdir -p "app/expense/[expenseId]/edit"
cat > "app/expense/[expenseId]/edit/page.tsx" << 'TSX'
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExpenseForm from "@/components/ExpenseForm";

export default async function EditExpense({ params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { items: { include: { claims: true } }, group: { include: { members: true } } },
  });
  if (!expense) notFound();

  const g = expense.group;
  const splitMode = expense.splitMode === "EQUAL" ? "EQUAL" : "UNEQUAL";

  const items = expense.items.map((it) => ({
    id: it.id,
    name: it.name,
    price: Number(it.price),
    memberIds: it.claims.map((c) => c.memberId),
  }));

  const includedIds =
    splitMode === "EQUAL"
      ? g.members.map((m) => m.id)
      : Array.from(new Set(items.flatMap((i) => i.memberIds)));

  const edit = {
    id: expense.id,
    groupId: g.id,
    description: expense.description,
    amount: Number(expense.amount).toFixed(2),
    category: expense.category as string,
    splitMode: splitMode as "EQUAL" | "UNEQUAL",
    date: expense.date.toISOString().slice(0, 10),
    items,
    includedIds: includedIds.length ? includedIds : g.members.map((m) => m.id),
  };

  return (
    <ExpenseForm
      groups={[{ id: g.id, name: g.name, members: g.members.map((m) => ({ id: m.id, name: m.name })) }]}
      edit={edit}
    />
  );
}
TSX
ok "edit page created"

info "Rewriting components/ExpenseForm.tsx (with edit support + animations)..."
cat > components/ExpenseForm.tsx << 'TSX'
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Car, Clapperboard, Fuel, Hotel, ImagePlus,
  ReceiptText, ShoppingCart, Utensils, Zap, Shapes, X, ChevronDown, Check,
} from "lucide-react";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { uuid } from "@/lib/uuid";
import { money, initials } from "@/lib/utils";

type Group  = { id: string; name: string; members: { id: string; name: string }[] };
type Member = { id: string; name: string };
type Item   = { id: string; name: string; price: number; memberIds: string[] };

type EditData = {
  id: string;
  groupId: string;
  description: string;
  amount: string;
  category: string;
  splitMode: "EQUAL" | "UNEQUAL";
  date: string;
  items: Item[];
  includedIds: string[];
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
  return (
    <HapticButton onClick={onClick} className={`flex h-[38px] items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-black ${className}`}>
      {children}
    </HapticButton>
  );
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

  const group      = groups.find((g) => g.id === groupId);
  const allMembers: Member[] = useMemo(() => group?.members || [], [group]);

  // Default to everyone only when nothing is selected yet (preserves edit data)
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

  async function parseReceipt(file: File) {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/receipt/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || `Receipt parsing failed (${res.status})`); return; }
      setItems((data.items || []).map((x: { name?: string; price?: number }, i: number) => ({
        id: uuid(), name: x.name || `Item ${i + 1}`, price: Number(x.price || 0), memberIds: [...includedIds],
      })));
      setSplitMode("UNEQUAL");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Receipt parsing failed");
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
    if (!groupId) return alert("Select a group first");
    if (!(Number(amount) > 0)) return alert("Enter an amount greater than zero");
    if (selectedMembers.length === 0) return alert("Pick at least one member to split with");
    setSaving(true);
    try {
      const cleanItems = items.map((i) => ({ ...i, memberIds: i.memberIds.filter((id) => includedIds.includes(id)) }));
      const url    = edit ? `/api/expenses/${edit.id}` : "/api/expenses";
      const method = edit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId, description: description || "Expense", amount: Number(amount),
          category, splitMode, date, guestSessionId: getGuestSessionId(),
          items: splitMode === "UNEQUAL" ? cleanItems : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/groups/${groupId}`);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        {/* Top bar */}
        <div className="flex items-center gap-2">
          <HapticButton onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--soft)]" aria-label="Close">
            <X className="h-5 w-5" />
          </HapticButton>
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
        <div className="mt-4">
          <Label>Description</Label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="input-field h-[50px] px-4 text-[15px]" />
        </div>

        {/* Paid by / Split */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label>Paid by</Label>
            <PillBtn onClick={() => setSheet("paid")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]"><span>You</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></PillBtn>
          </div>
          <div>
            <Label>Split</Label>
            <PillBtn onClick={() => setSheet("split")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]"><span>{splitLabel}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></PillBtn>
          </div>
        </div>

        {/* Date */}
        <div className="mt-4">
          <Label>Date</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field h-[50px] px-4 text-[15px]" />
        </div>

        {/* Category */}
        <div className="mt-4">
          <Label>Category</Label>
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
                      className={["tap-scale rounded-full px-3 py-1.5 text-[11px] font-black transition-colors", i.memberIds.includes(m.id) ? "bg-mint-700 text-white" : "bg-[var(--soft)] text-[var(--muted)]"].join(" ")}>
                      {m.name}
                    </button>
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
                <div className="mt-4 space-y-2">
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
                  }) : <p className="text-[13px] text-[var(--muted)]">No members yet. Add members or share the invite link first.</p>}
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

            {sheet === "paid" && (
              <>
                <h2 className="text-[20px] font-black">Paid by</h2>
                <div className="mt-3 rounded-[13px] bg-mint-50 px-4 py-3 dark:bg-mint-900/20"><p className="text-[14px] font-black text-mint-700">You</p></div>
              </>
            )}

            <button onClick={() => setSheet(null)} className="btn-primary tap-scale mt-5 w-full text-[14px]">Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
TSX
ok "ExpenseForm.tsx rewritten with edit support"

# =============================================================================
# 6. Dashboard recent activity + Activity page
# =============================================================================
info "Rewriting app/dashboard/page.tsx (recent activity)..."
mkdir -p "app/dashboard"
cat > "app/dashboard/page.tsx" << 'TSX'
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import AppFrame from "@/components/AppFrame";
import Logo from "@/components/Logo";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { HapticLink } from "@/components/HapticLink";
import { initials, money } from "@/lib/utils";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const firstName = (session?.user?.name || "there").split(" ")[0];

  const groups = userId
    ? await prisma.group.findMany({ where: { members: { some: { userId } } }, include: { members: true, expenses: true }, take: 3, orderBy: { createdAt: "desc" } })
    : [];

  const groupIds = userId ? (await prisma.group.findMany({ where: { members: { some: { userId } } }, select: { id: true } })).map((g) => g.id) : [];
  const activities = groupIds.length
    ? await prisma.activity.findMany({ where: { groupId: { in: groupIds } }, include: { group: true }, orderBy: { createdAt: "desc" }, take: 6 })
    : [];

  return (
    <AppFrame>
      <Logo />
      <p className="mt-6 text-[15px] text-[var(--muted)]">Welcome back,</p>
      <h1 className="text-[28px] font-black tracking-tight">{firstName}</h1>

      <section className="mt-5">
        <Card className="p-6">
          <div className="page-eyebrow">Total Balance</div>
          <div className="mt-3 text-[48px] font-black leading-none tracking-[-.05em]">₹0.00</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] bg-[var(--soft)] p-4"><p className="text-[14px] font-medium text-[var(--muted)]">You&apos;re owed</p><p className="mt-1.5 text-[24px] font-black text-mint-500">₹0.00</p></div>
            <div className="rounded-[16px] bg-[var(--soft)] p-4"><p className="text-[14px] font-medium text-[var(--muted)]">You owe</p><p className="mt-1.5 text-[24px] font-black text-red-400">₹0.00</p></div>
          </div>
        </Card>
      </section>

      {groups.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="text-[20px] font-black tracking-tight">Your groups</h2>
          <div className="stagger mt-4 space-y-1">
            {groups.map((g) => (
              <HapticLink href={`/groups/${g.id}`} key={g.id} className="flex items-center justify-between rounded-[16px] p-2 hover:bg-[var(--soft)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[var(--soft)] text-[16px] font-black text-mint-700">{initials(g.name)}</div>
                  <div><div className="text-[16px] font-black">{g.name}</div><div className="text-[13px] text-[var(--muted)]">{g.members.length} members</div></div>
                </div>
                <div className="text-[15px] font-black text-mint-600">{money(0)}</div>
              </HapticLink>
            ))}
          </div>
        </Card>
      )}

      <h2 className="section-title mt-7">Recent activity</h2>
      {activities.length === 0 ? (
        <EmptyState subtitle="No recent activity yet" compact />
      ) : (
        <div className="stagger mt-4 space-y-2">
          {activities.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-black leading-snug">{a.title}</p>
                  {a.body && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{a.body}</p>}
                  {a.group && <p className="mt-0.5 text-[12px] font-black text-mint-600">{a.group.name}</p>}
                </div>
                <span className="shrink-0 text-[12px] text-[var(--muted)]">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppFrame>
  );
}
TSX
ok "dashboard rewritten"

info "Rewriting app/activity/page.tsx..."
mkdir -p "app/activity"
cat > "app/activity/page.tsx" << 'TSX'
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import AppFrame from "@/components/AppFrame";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";

export default async function Activity() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const groupIds = userId ? (await prisma.group.findMany({ where: { members: { some: { userId } } }, select: { id: true } })).map((g) => g.id) : [];
  const activities = groupIds.length
    ? await prisma.activity.findMany({ where: { groupId: { in: groupIds } }, include: { group: true }, orderBy: { createdAt: "desc" }, take: 50 })
    : [];

  return (
    <AppFrame>
      <h1 className="page-title">Activity</h1>
      {activities.length === 0 ? (
        <EmptyState subtitle="Your activity will appear here" />
      ) : (
        <div className="stagger mt-6 space-y-2">
          {activities.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-black leading-snug">{a.title}</p>
                  {a.body && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{a.body}</p>}
                  {a.group && <p className="mt-0.5 text-[12px] font-black text-mint-600">{a.group.name}</p>}
                </div>
                <span className="shrink-0 text-[12px] text-[var(--muted)]">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppFrame>
  );
}
TSX
ok "activity page rewritten"

# =============================================================================
# 5. Animations — append to globals.css (guarded so it won't duplicate)
# =============================================================================
info "Adding animations to app/globals.css..."
if ! grep -q "ANIM-BLOCK" app/globals.css; then
cat >> app/globals.css << 'CSS'

/* ===== ANIM-BLOCK : smooth motion (respects reduced-motion) ===== */
@media (prefers-reduced-motion: no-preference) {
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes sheetUp  { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

  .app-card { animation: fadeInUp .38s cubic-bezier(.22,.7,.2,1) both; }
  .animate-in { animation: fadeInUp .4s cubic-bezier(.22,.7,.2,1) both; }
  .animate-sheet { animation: sheetUp .32s cubic-bezier(.2,.85,.25,1) both; }
  .animate-overlay { animation: overlayIn .2s ease both; }

  .stagger > * { animation: fadeInUp .42s cubic-bezier(.22,.7,.2,1) both; }
  .stagger > *:nth-child(2) { animation-delay: .04s; }
  .stagger > *:nth-child(3) { animation-delay: .08s; }
  .stagger > *:nth-child(4) { animation-delay: .12s; }
  .stagger > *:nth-child(5) { animation-delay: .16s; }
  .stagger > *:nth-child(6) { animation-delay: .20s; }
  .stagger > *:nth-child(n+7) { animation-delay: .24s; }
}
CSS
fi
ok "animations added"

# =============================================================================
# Done
# =============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 7 done!                                                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  ✔ Build error fixed (corrected /api/expenses POST)            ║${NC}"
echo -e "${GREEN}║  ✔ Edit a saved expense (tap Edit on any expense)              ║${NC}"
echo -e "${GREEN}║  ✔ Delete expense + delete group (with confirm)               ║${NC}"
echo -e "${GREEN}║  ✔ Balance tab: net per person (gets back / owes / settled)   ║${NC}"
echo -e "${GREEN}║  ✔ Summary tab: 'A → B  ₹X' who pays the bill payer            ║${NC}"
echo -e "${GREEN}║  ✔ Members tab: list + invite                                 ║${NC}"
echo -e "${GREEN}║  ✔ Recent activity (dashboard) + Activity page show real logs ║${NC}"
echo -e "${GREEN}║  ✔ Renamed Splitwell -> SplitEZ everywhere                    ║${NC}"
echo -e "${GREEN}║  ✔ Smooth fade/slide animations (cards, sheets, lists)        ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  IMPORTANT for deploy: commit ALL changed files, then build.  ║${NC}"
echo -e "${GREEN}║  Local:  npm run dev                                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Note on balances: 'Paid by' is still always You for now, so the${NC}"
echo -e "${YELLOW}Summary attributes debts to the logged-in payer. A per-member${NC}"
echo -e "${YELLOW}'paid by' picker would be the next step if you want it.${NC}"
