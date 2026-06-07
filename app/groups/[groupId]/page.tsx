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
