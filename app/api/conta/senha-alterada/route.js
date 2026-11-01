import { NextResponse } from "next/server";
import { sendEmail, siteUrl } from "@/lib/email/send-email";
import { passwordChangedEmail } from "@/lib/email/templates";
import { getCurrentUser } from "@/lib/session";

// Chamado depois que a senha é trocada. Só envia para o e-mail da própria sessão (ninguém dispara para terceiros).
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ ok: false, skipped: true });
  const result = await sendEmail({ to: user.email, ...passwordChangedEmail({ base: siteUrl(), email: user.email }) });
  return NextResponse.json({ ok: Boolean(result.ok), skipped: Boolean(result.skipped) });
}
