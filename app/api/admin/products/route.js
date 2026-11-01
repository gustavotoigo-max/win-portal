import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { queryOne } from "@/lib/neon/database";
import { getProductOrNull, productPath } from "@/lib/products";

function jsonError(code, message, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

/** "1.234,56", "690", "690,00" ou 690.5 → centavos. */
function toCents(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : NaN;
  const s = String(value ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;
  // vírgula = decimal brasileiro; sem vírgula, "1.234" é milhar e "12.5" é decimal
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

// Define o preço de um produto do catálogo ({ productId, price }).
export async function POST(request) {
  const admin = await getAdminContext();
  if (!admin.isAuthenticated) return jsonError("auth_required", "Entre na sua conta.", 401);
  if (!admin.isAdmin) return jsonError("admin_required", "Acesso de administrador necessário.", 403);

  const body = await request.json().catch(() => ({}));
  const product = getProductOrNull(body.productId);
  if (!product) return jsonError("invalid_product", "Produto não encontrado.");
  const cents = toCents(body.price);
  if (!Number.isFinite(cents) || cents < 0 || cents > 100000000) return jsonError("invalid_price", "Informe um valor válido, por exemplo 690,00.");

  try {
    await queryOne(
      `insert into public.product_prices (product_id, price_cents, updated_by, updated_at) values ($1, $2, $3, now())
       on conflict (product_id) do update set price_cents = excluded.price_cents, updated_by = excluded.updated_by, updated_at = now()`,
      [product.id, cents, admin.userEmail || null]
    );
  } catch (e) {
    if (String(e?.message || "").includes("does not exist")) return jsonError("no_table", "Rode a migração neon/migrations/20261104_precos.sql no Neon.", 500);
    console.error("price update failed", e);
    return jsonError("server_error", "Não foi possível salvar o preço.", 500);
  }

  // páginas que mostram o preço passam a usar o valor novo na próxima visita
  revalidatePath("/", "layout");
  revalidatePath(productPath(product.id));
  return NextResponse.json({ ok: true, priceCents: cents });
}
