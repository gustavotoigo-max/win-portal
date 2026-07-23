import { NextResponse } from "next/server";
import { recordUserLoginMethod } from "@/lib/auth-profile";
import { getAuthSession } from "@/lib/auth/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
    }

    await recordUserLoginMethod({
      user: session.user,
      method: body.method,
      provider: body.provider,
      fullName: body.fullName,
      company: body.company,
      preferredLocale: body.preferredLocale
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
