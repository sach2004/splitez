import { notFound } from "next/navigation";
import {
  ArrowLeft, MoreVertical, ReceiptText, Plus, UserRoundPlus, Pencil, RefreshCw,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";
import { HapticLink } from "@/components/HapticLink";
import ShareButton from "@/components/ShareButton";

export default async function GroupDetail({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      expenses: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!group) notFound();

  return (
    <main className="app-shell">
      <div className="app-content pb-[calc(300px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HapticLink href="/groups" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--soft)] text-[var(--foreground)]">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </HapticLink>
            <h1 className="max-w-[220px] truncate text-[22px] font-black tracking-[-.03em]">{group.name}</h1>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full text-[var(--muted)]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Member chips */}
        {group.members.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {group.members.map((m) => (
              <span key={m.id} className="rounded-full bg-[var(--soft)] px-3 py-1 text-[12px] font-black text-[var(--muted)]">
                {m.name}
              </span>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="no-scrollbar mt-5 flex gap-6 overflow-x-auto border-b border-[var(--line)] text-[15px]">
          {["Activity", "Balance", "Summary", "Members"].map((tab, i) => (
            <span
              key={tab}
              className={["shrink-0 pb-3 font-black", i === 0 ? "border-b-[2.5px] border-mint-700 text-mint-700" : "text-[var(--muted)]"].join(" ")}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Expenses */}
        {group.expenses.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-mint-50 text-mint-600 dark:bg-mint-900/20">
              <ReceiptText className="h-9 w-9" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[22px] font-black tracking-[-.03em]">No expenses yet</h2>
              <p className="mt-1 text-[15px] text-[var(--muted)]">Tap &quot;Add expense&quot; below</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {group.expenses.map((e) => (
              <div key={e.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[16px] font-black leading-snug">{e.description}</p>
                  <span className="shrink-0 text-[16px] font-black text-mint-700">
                    {money(e.amount.toString(), group.currency)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {e.splitMode === "EQUAL" ? "Split equally" : `${e.items.length} item${e.items.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action sheet */}
      <div className="fixed bottom-0 left-1/2 z-30 w-[min(100vw,430px)] -translate-x-1/2 rounded-t-[22px] border-t border-[var(--line)] bg-[var(--card)] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,.13)] dark:shadow-[0_-8px_30px_rgba(0,0,0,.4)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--line)]" />
        <div className="space-y-0.5">
          <SheetLink href={`/expense/new?groupId=${group.id}`} icon={<Plus />} label="Add expense" />
          <SheetLink href={`/groups/${group.id}/add-member`} icon={<UserRoundPlus />} label="Add members" />
          <ShareButton groupId={group.id} />
          <div className="flex h-12 items-center gap-3.5 text-[16px] font-semibold text-[var(--muted)]">
            <Pencil className="h-[18px] w-[18px] text-mint-600" />Edit group
          </div>
          <div className="flex h-12 items-center gap-3.5 text-[16px] font-semibold text-[var(--muted)]">
            <RefreshCw className="h-[18px] w-[18px] text-mint-600" />Currency: {group.currency}
          </div>
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
