import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["active", "revoked", "blocked"]);

export async function POST(request) {
  try {
    const form = await request.formData();
    const licenseId = form.get("licenseId");
    const status = form.get("action");

    if (!licenseId || !allowed.has(status)) {
      return NextResponse.json({ error: "Invalid license update." }, { status: 400 });
    }

    const authClient = await createClient();
    const { data: userData } = await authClient.auth.getUser();

    if (!userData?.user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("licenses")
      .update({
        status,
        revoked_at: status === "revoked" ? new Date().toISOString() : null
      })
      .eq("id", licenseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("license_events").insert({
      license_id: licenseId,
      action: status,
      notes: "Updated from admin panel"
    });

    const referer = request.headers.get("referer") || "/";
    return NextResponse.redirect(referer, 303);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
