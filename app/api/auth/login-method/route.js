import { NextResponse } from "next/server";
import { recordUserLoginMethod } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
    }

    await recordUserLoginMethod({
      user: data.user,
      method: body.method,
      provider: body.provider
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
