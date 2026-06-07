import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExpenseForm from "@/components/ExpenseForm";

export default async function EditExpense({ params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { items: { include: { claims: true } }, group: { include: { members: true } } },
  });
  if (!expense) notFound();

  const g = expense.group;
  const splitMode = expense.splitMode === "EQUAL" ? "EQUAL" : "UNEQUAL";

  const items = expense.items.map((it) => ({
    id: it.id,
    name: it.name,
    price: Number(it.price),
    memberIds: it.claims.map((c) => c.memberId),
  }));

  const includedIds =
    splitMode === "EQUAL"
      ? g.members.map((m) => m.id)
      : Array.from(new Set(items.flatMap((i) => i.memberIds)));

  const edit = {
    id: expense.id,
    groupId: g.id,
    description: expense.description,
    amount: Number(expense.amount).toFixed(2),
    category: expense.category as string,
    splitMode: splitMode as "EQUAL" | "UNEQUAL",
    date: expense.date.toISOString().slice(0, 10),
    items,
    includedIds: includedIds.length ? includedIds : g.members.map((m) => m.id),
  };

  return (
    <ExpenseForm
      groups={[{ id: g.id, name: g.name, members: g.members.map((m) => ({ id: m.id, name: m.name })) }]}
      edit={edit}
    />
  );
}
