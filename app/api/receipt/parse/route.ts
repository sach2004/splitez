import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const itemSchema = z.object({
  name:  z.string(),
  price: z.number().nonnegative(),
});

export async function POST(req: Request) {
  // Always return JSON — never let an exception bubble up as an empty 500 body.
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Receipt file required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("PASTE") || apiKey.includes("YOUR")) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file." },
        { status: 500 }
      );
    }

    const bytes   = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract receipt line items. Return ONLY a JSON object like {\"items\":[{\"name\":\"string\",\"price\":0.00}]}. Include tax, service charge, delivery charge, discounts and tip as separate items if visible. Do not invent prices.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ] as Parameters<typeof openai.chat.completions.create>[0]["messages"][0]["content"],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: text },
        { status: 502 }
      );
    }

    const rawItems = Array.isArray((json as { items?: unknown }).items)
      ? (json as { items: unknown[] }).items
      : [];

    const items = rawItems
      .map((x) => itemSchema.safeParse(x))
      .filter((x) => x.success)
      .map((x) => (x as { success: true; data: z.infer<typeof itemSchema> }).data);

    return NextResponse.json({ items });

  } catch (err: unknown) {
    // Catch OpenAI auth errors, network errors, etc. — always return JSON
    const message =
      err instanceof Error ? err.message : "Receipt parsing failed";
    const status =
      (err as { status?: number }).status === 401 ? 401
      : (err as { status?: number }).status === 429 ? 429
      : 500;

    console.error("[receipt/parse] Error:", err);

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
