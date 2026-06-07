import { notFound } from "next/navigation";
import { ArrowLeft, MoreVertical, ReceiptText, Plus, UserRoundPlus, Pencil, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { HapticLink } from "@/components/HapticLink";

export default async function GroupDetail({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true, expenses: { include: { items: true }, orderBy: { createdAt: "desc" } } } });
  if (!group) notFound();

  return (
    <main className="app-shell">
      <div className="app-content pb-[calc(238px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HapticLink href="/groups" className="grid h-10 w-10 place-items-center rounded-full"><ArrowLeft className="h-6 w-6" /></HapticLink>
            <h1 className="text-[25px] font-black tracking-[-.03em]">{group.name}</h1>
          </div>
          <MoreVertical className="h-6 w-6" />
        </div>
        <div className="no-scrollbar mt-7 flex gap-8 overflow-x-auto border-b border-neutral-200 text-[17px] dark:border-neutral-800">
          <span className="shrink-0 border-b-[3px] border-mint-700 pb-3 font-black text-mint-700">Activity</span><span className="shrink-0 pb-3 text-neutral-600">Balance</span><span className="shrink-0 pb-3 text-neutral-600">Summary</span><span className="shrink-0 pb-3 text-neutral-600">Members</span>
        </div>
        {group.expenses.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <ReceiptText className="h-16 w-16 text-neutral-400" />
            <h2 className="mt-6 text-[25px] font-black tracking-[-.03em]">No expenses yet</h2>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {group.expenses.map((e) => (
              <div key={e.id} className="app-card p-4">
                <div className="flex justify-between gap-3"><b className="text-lg">{e.description}</b><span className="font-black">{money(e.amount.toString(), group.currency)}</span></div>
                <p className="mt-1 text-sm text-neutral-500">{e.items.length} parsed items</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-1/2 z-30 w-[min(100vw,430px)] -translate-x-1/2 rounded-t-[24px] bg-white px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_34px_rgba(0,0,0,.14)] dark:bg-neutral-900">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-mint-100" />
        <SheetLink href={`/expense/new?groupId=${group.id}`} icon={<Plus />} label="Add expense" />
        <SheetLink href={`/groups/${group.id}/add-member`} icon={<UserRoundPlus />} label="Add members" />
        <div className="flex h-12 items-center gap-4 text-[17px] font-semibold"><Pencil className="h-5 w-5 text-mint-700" />Edit group</div>
        <div className="flex h-12 items-center gap-4 text-[17px] font-semibold"><RefreshCw className="h-5 w-5 text-mint-700" />Currency: {group.currency}</div>
      </div>
    </main>
  );
}

function SheetLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <HapticLink href={href} className="flex h-12 items-center gap-4 text-[17px] font-semibold text-neutral-900 dark:text-white [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-mint-700">{icon}{label}</HapticLink>;
}
