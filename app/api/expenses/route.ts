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
