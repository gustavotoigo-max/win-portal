import { NextResponse } from "next/server";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";

export async function POST(request) {
  const form = await request.formData();
  const locale = form.get("locale") || "pt";

  if (isAuthConfigured()) {
    await getAuth().signOut();
  }

  return NextResponse.redirect(new URL(`/${locale}`, request.url), 303);
}
