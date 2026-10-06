import { NextResponse } from "next/server";
import { recordLicenseEvent } from "@/lib/licenses/issue";
import { query, queryOne } from "@/lib/neon/database";
import { getCurrentUser } from "@/lib/session";

// Libera uma maquina da licenca do proprio cliente. Faz o mesmo que a acao
// "Limpar ativacao" do ADM, mas apenas para a ativacao escolhida.
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Entre na sua conta." }, { status: 401 });
    }

    const { activationId } = await request.json().catch(() => ({}));
    if (!/^[0-9a-f-]{36}$/i.test(String(activationId || ""))) {
      return NextResponse.json({ ok: false, message: "Ativação inválida." }, { status: 400 });
    }

    const activation = await queryOne(
      `select a.id, a.license_id, coalesce(a.machine_name, a.machine_id) as machine
       from public.activations a
       join public.licenses l on l.id = a.license_id
       where a.id = $1
         and (l.user_id = $2 or lower(l.customer_email) = lower($3))`,
      [activationId, user.id, user.email || ""]
    );

    if (!activation) {
      return NextResponse.json({ ok: false, message: "Ativação não encontrada." }, { status: 404 });
    }

    await query("delete from public.activations where id = $1", [activation.id]);
    await recordLicenseEvent(
      activation.license_id,
      "clear_activation",
      `Machine ${activation.machine} released by customer`
    );

    return NextResponse.json({ ok: true, message: "Computador desvinculado." });
  } catch (error) {
    console.error("Could not release activation:", error);
    return NextResponse.json({ ok: false, message: "Não foi possível desvincular agora." }, { status: 500 });
  }
}
