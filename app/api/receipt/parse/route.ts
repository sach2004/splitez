import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
const itemSchema = z.object({ name: z.string(), price: z.number().nonnegative() });
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Receipt file required" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: [
      { type: "text", text: "Extract receipt line items. Return ONLY JSON object {items:[{name:string,price:number}]}. Include tax, service charge, delivery charge, discounts and tip as their own separate items if visible. Do not proportionally allocate tax or tip. Do not invent missing prices." },
      { type: "image_url", image_url: { url: dataUrl } }
    ] as any }]
  });
  const text = completion.choices[0]?.message?.content || "{}";
  let json: unknown;
  try { json = JSON.parse(text); } catch { return NextResponse.json({ error: "AI returned invalid JSON", raw: text }, { status: 502 }); }
  const rawItems = Array.isArray((json as any).items) ? (json as any).items : [];
  const items = rawItems.map((x: any) => itemSchema.safeParse(x)).filter((x: any) => x.success).map((x: any) => x.data);
  return NextResponse.json({ items });
}
