#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch8.sh  —  Run from project root
#
# Fixes: the bottom action sheet on the group page is shoved to the right.
#
# WHY: the sheet centered itself with Tailwind's `-translate-x-1/2`
# (transform: translateX(-50%)). It also has `animate-sheet`, whose keyframes
# animate `transform: translateY(...)`. A CSS animation's transform OVERRIDES
# the class transform, so when the slide finishes (`both` fill mode) it sets
# `transform: translateY(0)` — erasing the translateX(-50%). Result: the sheet
# sits at left:50% with no shift-back, pushed to the right.
#
# FIX: center with `inset-x-0 mx-auto max-w-[430px]` (no transform), so the
# translateY animation can't conflict with horizontal centering.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

info "Rewriting app/groups/[groupId]/page.tsx (fix sheet centering)..."
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

      {/* Action sheet — centered with inset-x-0 + mx-auto (NO transform, so the
          slide-up animation's translateY can't knock it sideways). */}
      <div className="animate-sheet fixed bottom-0 inset-x-0 z-30 mx-auto w-full max-w-[430px] rounded-t-[22px] border-t border-[var(--line)] bg-[var(--card)] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,.13)] dark:shadow-[0_-8px_30px_rgba(0,0,0,.4)]">
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
ok "group detail page fixed"

# Also harden BottomNav + FloatingAddButton: they use -translate-x-1/2 too.
# They have NO animation so they're currently fine, but switching them to the
# transform-free centering keeps everything consistent and future-proof.
info "Hardening BottomNav.tsx centering..."
cat > components/BottomNav.tsx << 'TSX'
"use client";

import { usePathname } from "next/navigation";
import { Activity, Grid2X2, Settings, UsersRound, UserRoundPlus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
import { cn } from "@/lib/utils";

const items = [
  ["/dashboard", "Home",    Grid2X2],
  ["/groups",    "Groups",  UsersRound],
  ["/friends",   "Friends", UserRoundPlus],
  ["/activity",  "Activity", Activity],
  ["/account",   "Account", Settings],
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-[430px]",
        "rounded-t-[22px] border-t border-black/[.04]",
        "bg-[#f3f6f1]/95 dark:bg-[#171c1a]/95 backdrop-blur-xl",
        "px-1.5 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]",
        "shadow-[0_-6px_22px_rgba(0,0,0,.09)] dark:border-white/[.055] dark:shadow-[0_-6px_22px_rgba(0,0,0,.35)]"
      )}
    >
      <div className="grid grid-cols-5">
        {items.map(([href, label, Icon]) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(`${href}/`));
          return (
            <HapticLink
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-[50px] rounded-[15px]",
                "text-[10px] font-black leading-none tracking-tight",
                active ? "bg-mint-50 text-mint-700 dark:bg-mint-900/25 dark:text-mint-300" : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <Icon className="h-[20px] w-[20px] shrink-0" strokeWidth={active ? 2.8 : 2.2} />
              <span className="mt-0.5 w-full truncate px-1 text-center">{label}</span>
            </HapticLink>
          );
        })}
      </div>
      <div className="mx-auto mt-1.5 h-[3px] w-24 rounded-full bg-neutral-400/45 dark:bg-neutral-600/60" />
    </nav>
  );
}
TSX
ok "BottomNav.tsx hardened"

info "Hardening FloatingAddButton.tsx centering..."
cat > components/FloatingAddButton.tsx << 'TSX'
import { Plus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";

export default function FloatingAddButton() {
  return (
    <div className="pointer-events-none fixed bottom-[calc(84px+env(safe-area-inset-bottom))] inset-x-0 z-30 mx-auto w-full max-w-[430px] px-4">
      <HapticLink
        href="/expense/new"
        className="pointer-events-auto ml-auto flex h-[44px] w-[156px] items-center justify-center gap-1.5 rounded-[14px] bg-gradient-to-r from-mint-700 to-mint-400 text-[14px] font-black text-white shadow-[0_10px_28px_rgba(0,128,105,.25)]"
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />
        <span className="whitespace-nowrap">Add Expense</span>
      </HapticLink>
    </div>
  );
}
TSX
ok "FloatingAddButton.tsx hardened"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 8 done — the sheet is centered again.                   ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  CAUSE: the sheet centered with -translate-x-1/2 (a transform) ║${NC}"
echo -e "${GREEN}║  while animate-sheet animates transform: translateY. The CSS   ║${NC}"
echo -e "${GREEN}║  animation overrode the class transform and erased the         ║${NC}"
echo -e "${GREEN}║  horizontal -50% shift → sheet jumped to the right.           ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  FIX: center with inset-x-0 + mx-auto + max-w-[430px] (no      ║${NC}"
echo -e "${GREEN}║  transform). Applied the same to BottomNav + FAB to be safe.  ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Restart:  npm run dev                                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
