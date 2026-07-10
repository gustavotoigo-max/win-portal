import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const allowed = new Set(["active", "revoked", "blocked", "clear_activation"]);

export async function POST(request) {
  try {
    const form = await request.formData();
    const licenseId = form.get("licenseId");
    const status = form.get("action");

    if (!licenseId || !allowed.has(status)) {
      return NextResponse.json({ error: "Invalid license update." }, { status: 400 });
    }

    const adminContext = await getAdminContext();

    if (!adminContext.isAuthenticated) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    if (!adminContext.isAdmin) {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    const supabase = createAdminClient();

    if (status === "clear_activation") {
      const { error: activationsError } = await supabase
        .from("activations")
        .delete()
        .eq("license_id", licenseId);

      if (activationsError) {
        return NextResponse.json({ error: activationsError.message }, { status: 500 });
      }

      const { error: machinesError } = await supabase
        .from("machines")
        .delete()
        .eq("license_id", licenseId);

      if (machinesError) {
        return NextResponse.json({ error: machinesError.message }, { status: 500 });
      }
    } else {
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
    }

    await supabase.from("license_events").insert({
      license_id: licenseId,
      action: status,
      notes: status === "clear_activation"
        ? "Activation records cleared from admin panel"
        : "Updated from admin panel"
    });

    const referer = request.headers.get("referer") || "/";
    return NextResponse.redirect(referer, 303);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
