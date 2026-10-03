import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { api } from "@/lib/http";

export const GET = api(async () => {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: u.session.userId,
      email: u.session.email,
      name: u.name,
      orgId: u.session.orgId,
      isSuperAdmin: u.session.isSuperAdmin,
      roleName: u.roleName,
      permissions: u.permissions,
    },
  });
});
