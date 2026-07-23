import { NextResponse } from "next/server";
import { recordUserLoginMethod } from "@/lib/auth-profile";
import { getAdminContext } from "@/lib/admin-auth";
import { getAuthSession } from "@/lib/auth/server";
import { normalizeLocale } from "@/lib/i18n";

function safeNextPath(next, locale) {
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return `/${locale}/dashboard`;
}

async function getRedirectForUser(user, locale, next) {
  if (next) return safeNextPath(next, locale);
  if (!user) return `/${locale}/login`;

  const adminContext = await getAdminContext();
  return adminContext.isAdmin ? "/ADM" : `/${locale}/dashboard`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale") || "pt");
  const method = url.searchParams.get("method") || "unknown";
  const next = url.searchParams.get("next");

  const session = await getAuthSession();
  const user = session?.user;
  await recordUserLoginMethod({
    user,
    method,
    provider: method
  });

  const target = await getRedirectForUser(user, locale, next);
  return NextResponse.redirect(new URL(target, request.url));
}
