import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/session";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  const adminContext = await getAdminContext();

  if (!adminContext.isAuthenticated) {
    return NextResponse.json({ target: "/pt/login" }, { status: 401 });
  }

  if (next) {
    return NextResponse.json({ target: safeNextPath(next) });
  }

  return NextResponse.json({
    target: adminContext.isAdmin ? "/ADM" : "/pt/dashboard"
  });
}
