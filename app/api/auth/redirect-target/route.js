import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { normalizeLocale } from "@/lib/i18n";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale") || "pt");
  const adminContext = await getAdminContext();

  if (!adminContext.isAuthenticated) {
    return NextResponse.json({ target: `/${locale}/login` }, { status: 401 });
  }

  return NextResponse.json({
    target: adminContext.isAdmin ? "/ADM" : `/${locale}/dashboard`
  });
}
