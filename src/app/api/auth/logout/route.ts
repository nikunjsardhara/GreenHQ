import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { api } from "@/lib/http";

export const POST = api(async () => {
  await logout();
  return NextResponse.json({ ok: true });
});
