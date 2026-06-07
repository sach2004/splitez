import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, SplitMode } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const body = await req.json();
  if (!body.groupId) return NextResponse.json({ error: "Group required" }, { status: 400 });
  const amount = Number(body.amount || 0);
  if (!(amount > 0)) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
  const payerMemberId = body.payerMemberId || null;
  const expense = await prisma.expense.create({
    data: {
      groupId: body.groupId,
      description: body.description || "Expense",
      amount,
      category: (body.category || "FOOD") as ExpenseCategory,
      splitMode: (body.splitMode || "EQUAL") as SplitMode,
      payerUserId: userId || null,
      payerMemberId,
      items: { create: (body.items || []).map((item: any) => ({ name: item.name, price: Number(item.price), claims: { create: (item.memberIds || []).map((memberId: string) => ({ memberId, claimedBySessionId: body.guestSessionId || null })) } })) },
      group: { update: { activities: { create: { title: `Added ${body.description || "expense"}`, body: `${amount.toFixed(2)} split ${body.splitMode || "EQUAL"}` } } } }
    },
    include: { items: { include: { claims: true } }, group: true }
  });
  return NextResponse.json(expense);
}
