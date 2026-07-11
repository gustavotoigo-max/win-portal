import { NextResponse } from "next/server";
import { recordUserLoginMethod } from "@/lib/auth-profile";
import { getConfiguredAdminEmails } from "@/lib/admin-auth";
import { normalizeLocale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next, locale) {
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return `/${locale}/dashboard`;
}

async function getRedirectForUser(user, locale, next) {
  if (next) return safeNextPath(next, locale);
  if (!user) return `/${locale}/login`;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return `/${locale}/dashboard`;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const userEmail = user.email?.toLowerCase() || profile?.email?.toLowerCase() || "";
  const isAdmin = profile?.role === "admin" || getConfiguredAdminEmails().includes(userEmail);
  return isAdmin ? "/ADM" : `/${locale}/dashboard`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale") || "pt");
  const code = url.searchParams.get("code");
  const method = url.searchParams.get("method") || "unknown";
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/login?auth=callback_error`, request.url));
  }

  const { data } = await supabase.auth.getUser();
  await recordUserLoginMethod({
    user: data?.user,
    method,
    provider: data?.user?.app_metadata?.provider || method
  });

  const target = await getRedirectForUser(data?.user, locale, next);
  return NextResponse.redirect(new URL(target, request.url));
}
