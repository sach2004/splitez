import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppFrame from "@/components/AppFrame";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { HapticLink } from "@/components/HapticLink";
import { initials } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function Groups() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const groups = userId ? await prisma.group.findMany({ where: { members: { some: { userId } } }, include: { members: true }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <AppFrame>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="page-eyebrow">Portfolio</div>
          <h1 className="page-title mt-3">Your<br />Groups</h1>
        </div>
        <HapticLink href="/groups/new" className="mt-5 flex h-11 shrink-0 items-center gap-2 rounded-[16px] bg-gradient-to-r from-mint-700 to-mint-400 px-4 text-[16px] font-black text-white shadow-[0_12px_30px_rgba(0,128,105,.18)]">
          <Plus className="h-5 w-5" strokeWidth={3} />Create
        </HapticLink>
      </div>
      {groups.length === 0 ? (
        <EmptyState type="users" title="No groups yet" subtitle="Create your first group to start splitting expenses" />
      ) : (
        <div className="mt-8 space-y-3">
          {groups.map((g) => (
            <HapticLink key={g.id} href={`/groups/${g.id}`} className="block">
              <Card className="flex items-center gap-3 p-4">
                <div className="grid h-12 w-12 place-items-center rounded-[15px] bg-neutral-100 text-lg font-black text-mint-700 dark:bg-neutral-800">{initials(g.name)}</div>
                <div><h2 className="text-lg font-black">{g.name}</h2><p className="text-sm text-neutral-500">{g.members.length} members</p></div>
              </Card>
            </HapticLink>
          ))}
        </div>
      )}
    </AppFrame>
  );
}
