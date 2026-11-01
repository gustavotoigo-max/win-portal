"use server";

import { redirect } from "next/navigation";
import {
  approveRequest,
  denyRequest,
  getPendingRequest,
  hasValidLicense,
  normalizeUserCode
} from "@/lib/npap/device-auth";
import { ensureProfile, getCurrentUser } from "@/lib/session";

// Server Action: o Next confere a origem da requisicao (protecao contra CSRF).
export async function decideConnection(formData) {
  const code = normalizeUserCode(formData.get("codigo"));
  const decision = formData.get("decisao");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/pt/login?next=${encodeURIComponent(code ? `/pt/conectar?codigo=${code}` : "/pt/conectar")}`);
  }
  if (!code) redirect("/pt/conectar");

  if (decision !== "autorizar") {
    await denyRequest(code, "USER_DENIED");
    redirect("/pt/conectar?resultado=recusado");
  }

  const request = await getPendingRequest(code);
  if (!request) redirect(`/pt/conectar?codigo=${code}`);   // a pagina mostra "invalido ou expirado"

  await ensureProfile(user);
  if (!(await hasValidLicense(user, request.product_id))) {
    await denyRequest(code, "NO_LICENSE");
    redirect("/pt/conectar?resultado=sem-licenca");
  }

  const ok = await approveRequest(request.id, user);
  redirect(ok ? "/pt/conectar?resultado=autorizado" : `/pt/conectar?codigo=${code}`);
}
