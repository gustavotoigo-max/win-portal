import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

// O site e somente em portugues. Qualquer caminho sem /pt (inclusive os antigos
// /en/...) e redirecionado para o equivalente em /pt.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/ADM" ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const rest = pathname === "/en" ? "" : pathname.startsWith("/en/") ? pathname.slice(3) : pathname === "/" ? "" : pathname;
  url.pathname = `/pt${rest}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
