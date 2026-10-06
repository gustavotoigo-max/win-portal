import { NextResponse } from "next/server";
import { recordUserLoginMethod } from "@/lib/auth-profile";
import { getAdminContext } from "@/lib/admin-auth";
import { getAuthSession } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/session";

async function getRedirectForUser(user, next) {
  if (next) return safeNextPath(next);
  if (!user) return "/pt/login";

  const adminContext = await getAdminContext();
  return adminContext.isAdmin ? "/ADM" : "/pt/dashboard";
}

export async function GET(request) {
  const url = new URL(request.url);
  const method = url.searchParams.get("method") || "unknown";
  const next = url.searchParams.get("next");

  const session = await getAuthSession();
  const user = session?.user;
  await recordUserLoginMethod({
    user,
    method,
    provider: method
  });

  const target = await getRedirectForUser(user, next);
  return NextResponse.redirect(new URL(target, request.url));
}
