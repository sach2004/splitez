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
