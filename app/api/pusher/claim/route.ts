import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherReady, pusherServer } from "@/lib/pusher";
export async function POST(req: Request) {
  const body = await req.json();
  const { groupId, receiptItemId, memberId, checked, guestSessionId } = body;
  if (!groupId || !receiptItemId || !memberId) return NextResponse.json({ error: "Missing claim fields" }, { status: 400 });
  if (checked) await prisma.itemClaim.upsert({ where: { receiptItemId_memberId: { receiptItemId, memberId } }, update: { claimedBySessionId: guestSessionId || null }, create: { receiptItemId, memberId, claimedBySessionId: guestSessionId || null } });
  else await prisma.itemClaim.deleteMany({ where: { receiptItemId, memberId } });
  const claims = await prisma.itemClaim.findMany({ where: { receiptItemId }, select: { memberId: true } });
  if (pusherReady()) await pusherServer.trigger(`group-${groupId}`, "claim-updated", { receiptItemId, memberIds: claims.map(c => c.memberId) });
  return NextResponse.json({ receiptItemId, memberIds: claims.map(c => c.memberId) });
}
