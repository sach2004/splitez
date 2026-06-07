import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import Logo from "@/components/Logo";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { HapticLink } from "@/components/HapticLink";
import { initials, money } from "@/lib/utils";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const groups = userId
    ? await prisma.group.findMany({ where: { members: { some: { userId } } }, include: { members: true, expenses: true }, take: 3, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <AppFrame>
      <Logo />
      <section className="mt-8">
        <Card className="p-6">
          <div className="page-eyebrow">Total Balance</div>
          <div className="mt-4 text-[52px] font-black leading-none tracking-[-.05em]">₹0.00</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-neutral-100 p-4 dark:bg-neutral-800">
              <p className="text-[15px] font-medium text-neutral-600 dark:text-neutral-300">You're owed</p>
              <p className="mt-2 text-[26px] font-black text-mint-400">₹0.00</p>
            </div>
            <div className="rounded-[18px] bg-neutral-100 p-4 dark:bg-neutral-800">
              <p className="text-[15px] font-medium text-neutral-600 dark:text-neutral-300">You owe</p>
              <p className="mt-2 text-[26px] font-black text-red-400">₹0.00</p>
            </div>
          </div>
        </Card>
      </section>

      {groups.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="text-[25px] font-black tracking-[-.03em]">Top Groups</h2>
          <div className="mt-5 space-y-2">
            {groups.map((g) => (
              <HapticLink href={`/groups/${g.id}`} key={g.id} className="flex items-center justify-between rounded-[18px] p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-[15px] bg-neutral-100 text-lg font-black text-mint-700 dark:bg-neutral-800">{initials(g.name)}</div>
                  <div><div className="text-lg font-black">{g.name}</div><div className="text-sm text-neutral-500">{g.members.length} members</div></div>
                </div>
                <div className="text-lg font-black text-mint-600">+{money(0)}</div>
              </HapticLink>
            ))}
          </div>
        </Card>
      )}

      <h1 className="section-title mt-8">Recent Activity</h1>
      <EmptyState subtitle="No recent activity" compact />
    </AppFrame>
  );
}
