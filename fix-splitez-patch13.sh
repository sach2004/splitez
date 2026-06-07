#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch13.sh  —  Run from project root
#
# Fix: on a group page with many members/expenses, the last names hide behind
# the fixed bottom action sheet and can't be scrolled into view.
#
# WHY: globals.css defines `.app-content { padding: 20px 18px 128px }` AFTER
# @tailwind utilities. So the Tailwind override `pb-[calc(320px+...)]` loses
# the cascade and the real bottom padding stays 128px — too short to clear the
# ~290px action sheet. The bottom of the list ends up behind the static sheet.
#
# FIX: set the bottom padding with an INLINE style (beats any stylesheet rule),
# so the scroll area always reserves enough room to scroll past the sheet.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

info "Rewriting app/groups/[groupId]/page.tsx (inline bottom padding)..."
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
      {/* Inline paddingBottom so it can't be overridden by the .app-content
          shorthand padding. Reserves room to scroll the list clear of the
          fixed action sheet below (which is ~290px tall). */}
      <div className="app-content" style={{ paddingBottom: "calc(330px + env(safe-area-inset-bottom))" }}>
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

      {/* Static action sheet — centered without transform (see patch 8). */}
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

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 13 done — names scroll clear of the sheet now.          ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  CAUSE: .app-content's shorthand 'padding: …128px' (defined    ║${NC}"
echo -e "${GREEN}║  after Tailwind utilities) overrode the pb-[320px] class, so   ║${NC}"
echo -e "${GREEN}║  the list only had 128px of bottom room — less than the ~290px ║${NC}"
echo -e "${GREEN}║  fixed sheet. The last names sat behind it, unreachable.       ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  FIX: paddingBottom is now an INLINE style (beats the          ║${NC}"
echo -e "${GREEN}║  stylesheet), reserving 330px so you can scroll every name     ║${NC}"
echo -e "${GREEN}║  above the static sheet.                                       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Restart:  npm run dev                                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
