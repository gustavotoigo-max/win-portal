import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { closeSession, releaseDevice, setDeviceBlocked } from "@/lib/npap/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages = {
  close_session: ["Sessão encerrada. O programa pedirá login de novo.", "Sessão não encontrada ou já encerrada."],
  release_device: ["Vaga liberada.", "Este computador já não ocupava vaga."],
  block_device: ["Computador bloqueado.", "O computador já estava bloqueado."],
  unblock_device: ["Computador desbloqueado.", "O computador não estava bloqueado."]
};

// Ações do ADM sobre o servidor NPAPcore (sessões e computadores).
export async function POST(request) {
  try {
    const admin = await getAdminContext();
    if (!admin.isAuthenticated) return NextResponse.json({ ok: false, message: "Entre na sua conta." }, { status: 401 });
    if (!admin.isAdmin) return NextResponse.json({ ok: false, message: "Acesso de administrador necessário." }, { status: 403 });

    const { action, sessionId, licenseId, deviceId } = await request.json().catch(() => ({}));
    if (!messages[action]) return NextResponse.json({ ok: false, message: "Ação inválida." }, { status: 400 });
    const ids = action === "close_session" ? [sessionId] : action === "release_device" ? [licenseId, deviceId] : [deviceId];
    if (!ids.every((id) => UUID.test(String(id || "")))) {
      return NextResponse.json({ ok: false, message: "Identificador inválido." }, { status: 400 });
    }

    const actor = `admin:${admin.userEmail}`.slice(0, 300);
    const done =
      action === "close_session" ? await closeSession(sessionId, actor)
      : action === "release_device" ? await releaseDevice(licenseId, deviceId, actor)
      : await setDeviceBlocked(deviceId, action === "block_device", actor);

    const [ok, noop] = messages[action];
    return NextResponse.json({ ok: true, changed: done, message: done ? ok : noop });
  } catch (error) {
    console.error("NPAP admin action failed:", error);
    return NextResponse.json({ ok: false, message: "Não foi possível concluir agora." }, { status: 500 });
  }
}
