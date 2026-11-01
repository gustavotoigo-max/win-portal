import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { emailConfigStatus, sendEmail, siteUrl } from "@/lib/email/send-email";
import { welcomeEmail } from "@/lib/email/templates";

// Envia um e-mail de teste para o próprio administrador e devolve o resultado (com o erro do servidor de e-mail, se houver).
export async function POST() {
  const admin = await getAdminContext();
  if (!admin.isAdmin || !admin.userEmail) {
    return NextResponse.json({ ok: false, message: "Acesso de administrador necessário." }, { status: 403 });
  }
  const mail = welcomeEmail({ base: siteUrl(), name: "Teste", email: admin.userEmail });
  const result = await sendEmail({ to: admin.userEmail, ...mail, subject: `[Teste] ${mail.subject}` });
  return NextResponse.json({ ...result, to: admin.userEmail, config: emailConfigStatus() });
}
