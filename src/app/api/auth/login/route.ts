import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/lib/auth";
import { api, badRequest, clientKey } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = api(async (req: NextRequest) => {
  const rl = checkRateLimit(`login:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts, try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Email and password are required.");
  try {
    const user = await loginWithPassword(parsed.data.email, parsed.data.password);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
});
