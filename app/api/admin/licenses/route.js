import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowed = new Set(["active", "revoked", "blocked"]);

export async function POST(request) {
  try {
    const form = await request.formData();
    const licenseId = form.get("licenseId");
    const status = form.get("action");

    if (!licenseId || !allowed.has(status)) {
      return NextResponse.json({ error: "Invalid license update." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("licenses")
      .update({ status })
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
