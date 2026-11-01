import { NextResponse } from "next/server";
import { licenseBelongsTo, releaseDevice } from "@/lib/npap/admin";
import { getCurrentUser } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O cliente libera um computador da própria licença (produtos do servidor NPAPcore).
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: "Entre na sua conta." }, { status: 401 });

    const { licenseId, deviceId } = await request.json().catch(() => ({}));
    if (!UUID.test(String(licenseId || "")) || !UUID.test(String(deviceId || ""))) {
      return NextResponse.json({ ok: false, message: "Computador inválido." }, { status: 400 });
    }
    if (!(await licenseBelongsTo(licenseId, user))) {
      return NextResponse.json({ ok: false, message: "Licença não encontrada." }, { status: 404 });
    }

    const done = await releaseDevice(licenseId, deviceId, `cliente:${user.email}`.slice(0, 300), "customer.device_released");
    return NextResponse.json({ ok: true, message: done ? "Computador liberado." : "Este computador já estava liberado." });
  } catch (error) {
    console.error("Could not release NPAP device:", error);
    return NextResponse.json({ ok: false, message: "Não foi possível liberar agora." }, { status: 500 });
  }
}
