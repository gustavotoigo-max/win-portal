import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const allowed = new Set(["active", "revoked", "blocked", "clear_activation"]);
const actionMessages = {
  active: "Licenca ativada com sucesso.",
  clear_activation: "Ativacao limpa com sucesso.",
  revoked: "Licenca revogada com sucesso.",
  blocked: "Licenca bloqueada com sucesso."
};

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const licenseId = payload.licenseId;
    const status = payload.action;

    if (!licenseId || !allowed.has(status)) {
      return NextResponse.json({ ok: false, message: "Invalid license update." }, { status: 400 });
    }

    const adminContext = await getAdminContext();

    if (!adminContext.isAuthenticated) {
      return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
    }

    if (!adminContext.isAdmin) {
      return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
    }

    const supabase = createAdminClient();

    if (status === "clear_activation") {
      const { error: activationsError } = await supabase
        .from("activations")
        .delete()
        .eq("license_id", licenseId);

      if (activationsError) {
        return NextResponse.json({ ok: false, message: activationsError.message }, { status: 500 });
      }

      const { error: machinesError } = await supabase
        .from("machines")
        .delete()
        .eq("license_id", licenseId);

      if (machinesError) {
        return NextResponse.json({ ok: false, message: machinesError.message }, { status: 500 });
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
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    await supabase.from("license_events").insert({
      license_id: licenseId,
      action: status,
      notes: status === "clear_activation"
        ? "Activation records cleared from admin panel"
        : "Updated from admin panel"
    });

    return NextResponse.json({ ok: true, message: actionMessages[status] });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
