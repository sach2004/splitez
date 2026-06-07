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
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const firstName = (session?.user?.name || "there").split(" ")[0];

  const groups = userId
    ? await prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: { members: true, expenses: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      })
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
            <div className="rounded-[16px] bg-[var(--soft)] p-4">
              <p className="text-[14px] font-medium text-[var(--muted)]">You&apos;re owed</p>
              <p className="mt-1.5 text-[24px] font-black text-mint-500">₹0.00</p>
            </div>
            <div className="rounded-[16px] bg-[var(--soft)] p-4">
              <p className="text-[14px] font-medium text-[var(--muted)]">You owe</p>
              <p className="mt-1.5 text-[24px] font-black text-red-400">₹0.00</p>
            </div>
          </div>
        </Card>
      </section>

      {groups.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="text-[20px] font-black tracking-tight">Your groups</h2>
          <div className="mt-4 space-y-1">
            {groups.map((g) => (
              <HapticLink
                href={`/groups/${g.id}`}
                key={g.id}
                className="flex items-center justify-between rounded-[16px] p-2 hover:bg-[var(--soft)]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[var(--soft)] text-[16px] font-black text-mint-700">
                    {initials(g.name)}
                  </div>
                  <div>
                    <div className="text-[16px] font-black">{g.name}</div>
                    <div className="text-[13px] text-[var(--muted)]">{g.members.length} members</div>
                  </div>
                </div>
                <div className="text-[15px] font-black text-mint-600">{money(0)}</div>
              </HapticLink>
            ))}
          </div>
        </Card>
      )}

      <h2 className="section-title mt-7">Recent activity</h2>
      <EmptyState subtitle="No recent activity yet" compact />
    </AppFrame>
  );
}
