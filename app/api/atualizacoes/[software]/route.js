import { NextResponse } from "next/server";
import { buildUpdateManifest, getUpdatableApp } from "@/lib/app-updates";

// Consultado pelos aplicativos para saber se há versão nova (ver docs/ATUALIZACOES.md).
export async function GET(_request, { params }) {
  const { software } = await params;
  const app = getUpdatableApp(software);
  if (!app) {
    return NextResponse.json({ error: "Aplicativo não encontrado." }, { status: 404 });
  }

  try {
    const { manifest, signature } = await buildUpdateManifest(app);
    if (!signature) {
      return NextResponse.json({ error: "Assinatura indisponível no servidor." }, { status: 503 });
    }
    return NextResponse.json(
      { manifest, signature },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
    );
  } catch (error) {
    console.error("Falha ao consultar atualizações.", error);
    return NextResponse.json({ error: "Não foi possível consultar as atualizações agora." }, { status: 502 });
  }
}
