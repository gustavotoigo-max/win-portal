import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { query } from "@/lib/neon/database";

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

    if (status === "clear_activation") {
      await query("delete from public.activations where license_id = $1", [licenseId]);
      await query("delete from public.machines where license_id = $1", [licenseId]);
    } else {
      await query(
        `update public.licenses
         set status = $1,
             revoked_at = case when $1 = 'revoked' then now() else null end
         where id = $2`,
        [status, licenseId]
      );
    }

    await query(
      `insert into public.license_events (license_id, admin_id, action, notes)
       values ($1, $2, $3, $4)`,
      [
        licenseId,
        adminContext.user?.id || null,
        status,
        status === "clear_activation"
          ? "Activation records cleared from admin panel"
          : "Updated from admin panel"
      ]
    );

    return NextResponse.json({ ok: true, message: actionMessages[status] });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
