import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, SplitMode } from "@prisma/client";

export async function PUT(req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  try {
    const { expenseId } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findUnique({ where: { id: expenseId }, select: { groupId: true } });
    if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const amount = Number(body.amount || 0);
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });

    let date: Date | undefined;
    if (body.date && typeof body.date === "string") {
      const d = new Date(body.date);
      if (!isNaN(d.getTime())) date = d;
    }

    const groupMembers = await prisma.member.findMany({ where: { groupId: existing.groupId }, select: { id: true } });
    const validMemberIds = new Set(groupMembers.map((m) => m.id));
    const splitMode = (body.splitMode || "EQUAL") as SplitMode;

    // Replace items wholesale: delete old (claims cascade), recreate new.
    await prisma.receiptItem.deleteMany({ where: { expenseId } });

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: body.description || "Expense",
        amount,
        category: (body.category || "FOOD") as ExpenseCategory,
        splitMode,
        ...(date ? { date } : {}),
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

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[expense PUT] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  try {
    const { expenseId } = await params;
    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[expense DELETE] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete expense" }, { status: 500 });
  }
}
