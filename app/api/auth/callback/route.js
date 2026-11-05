import { NextResponse } from "next/server";

// Endereço de retorno antigo. A sessão só pode ser confirmada no navegador, na página de retorno,
// que precisa receber a URL inteira, inclusive o código de verificação.
export function GET(request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/pt/entrando${url.search}`, request.url));
}
