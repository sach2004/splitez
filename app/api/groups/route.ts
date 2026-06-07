import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const groups = userId ? await prisma.group.findMany({ where: { members: { some: { userId } } }, include: { members: true, expenses: true }, orderBy: { createdAt: "desc" } }) : [];
  return NextResponse.json(groups);
}
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const body = await req.json();
  const name = String(body.name || "").trim();
  const guestSessionId = body.guestSessionId ? String(body.guestSessionId) : null;
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const group = await prisma.group.create({ data: { name, creatorId: userId, members: { create: { userId, guestSessionId, isGuest: !userId, name: user?.name || body.guestName || "You", email: user?.email || null } }, activities: { create: { title: `Created group ${name}` } } }, include: { members: true } });
  return NextResponse.json(group);
}
