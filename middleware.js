import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const locales = ["pt", "en"];

function preferredLocale(request) {
  const stored = request.cookies.get("winportal-locale")?.value;
  if (locales.includes(stored)) return stored;

  const acceptLanguage = request.headers.get("accept-language") || "";
  return acceptLanguage.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function copyCookies(fromResponse, toResponse) {
  fromResponse.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    toResponse.cookies.set(name, value, options);
  });
}

async function refreshSupabaseSession(request) {
  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  await supabase.auth.getUser();
  return response;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const sessionResponse = await refreshSupabaseSession(request);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/ADM" ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return sessionResponse;
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameHasLocale) {
    return sessionResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(sessionResponse, redirectResponse);
  return redirectResponse;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
