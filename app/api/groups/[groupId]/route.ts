import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await params;
    // members, expenses, items, claims, activities all cascade per schema
    await prisma.group.delete({ where: { id: groupId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[group DELETE] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete group" }, { status: 500 });
  }
}
