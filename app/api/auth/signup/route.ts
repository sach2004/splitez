import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const schema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid signup details" }, { status: 400 });
  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) } });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
