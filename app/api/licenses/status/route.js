import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowed = new Set(["revoked", "blocked", "clear_activation"]);

function jsonError(code, message, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    if (!token) {
      return jsonError("auth_required", "Authentication is required.", 401);
    }

    const { licenseId, action } = await request.json();

    if (!licenseId || !allowed.has(action)) {
      return jsonError("invalid_request", "Invalid license update.", 400);
    }

    const supabase = createAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return jsonError("auth_required", "Authentication is required.", 401);
    }

    const { data: license, error: licenseError } = await supabase
      .from("licenses")
      .select("id, user_id")
      .eq("id", licenseId)
      .eq("user_id", userData.user.id)
      .single();

    if (licenseError || !license) {
      return jsonError("not_found", "License not found.", 404);
    }

    if (action === "clear_activation") {
      const { error: activationsError } = await supabase
        .from("activations")
        .delete()
        .eq("license_id", licenseId);

      if (activationsError) {
        return jsonError("clear_failed", activationsError.message, 500);
      }

      const { error: machinesError } = await supabase
        .from("machines")
        .delete()
        .eq("license_id", licenseId);

      if (machinesError) {
        return jsonError("clear_failed", machinesError.message, 500);
      }
    } else {
      const { error: updateError } = await supabase
        .from("licenses")
        .update({
          status: action,
          revoked_at: action === "revoked" ? new Date().toISOString() : null
        })
        .eq("id", licenseId)
        .eq("user_id", userData.user.id);

      if (updateError) {
        return jsonError("update_failed", updateError.message, 500);
      }
    }

    await supabase.from("license_events").insert({
      license_id: licenseId,
      action,
      notes: action === "clear_activation"
        ? "Activation records cleared from customer dashboard"
        : "Updated from customer dashboard"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("server_error", error.message, 500);
  }
}
