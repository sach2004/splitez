import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const body = await req.json();
  const isGuest = Boolean(body.isGuest);
  const name = String(body.name || body.email || "Guest").trim();
  const email = body.email ? String(body.email).toLowerCase().trim() : null;
  const guestSessionId = body.guestSessionId || null;
  if (!isGuest && !email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const member = await prisma.member.create({ data: { groupId, userId: user?.id, guestSessionId, name, email, isGuest: isGuest || !user }, include: { user: true } });
  await prisma.activity.create({ data: { groupId, title: `${member.name} joined ${isGuest ? "as guest" : "as member"}` } });
  return NextResponse.json(member);
}
