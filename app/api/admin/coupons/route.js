import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { normalizeCouponCode } from "@/lib/coupons";
import { query, queryOne } from "@/lib/neon/database";
import { getProductOrNull } from "@/lib/products";

function jsonError(code, message, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

async function requireAdmin() {
  const admin = await getAdminContext();
  if (!admin.isAuthenticated) return { error: jsonError("auth_required", "Entre na sua conta.", 401) };
  if (!admin.isAdmin) return { error: jsonError("admin_required", "Acesso de administrador necessário.", 403) };
  return { admin };
}

const intOrNull = (v, min, max) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
};

// Cria um cupom.
export async function POST(request) {
  const { error, admin } = await requireAdmin();
  if (error) return error;
  const body = await request.json().catch(() => ({}));

  const code = normalizeCouponCode(body.code);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return jsonError("invalid_code", "Código: 3 a 40 letras, números, - ou _.");
  const percentOff = intOrNull(body.percentOff, 1, 100);
  if (!percentOff) return jsonError("invalid_percent", "Desconto entre 1% e 100%.");
  const maxUses = intOrNull(body.maxUses, 1, 100000);
  const licenseDays = intOrNull(body.licenseDays, 1, 3650);
  const maxMachines = intOrNull(body.maxMachines, 1, 10) ?? 1;
  if ([maxUses, licenseDays, maxMachines].some(Number.isNaN)) return jsonError("invalid_number", "Confira os números informados.");
  const productId = body.productId ? String(body.productId) : null;
  if (productId && !getProductOrNull(productId)) return jsonError("invalid_product", "Produto inválido.");

  let validUntil = null;
  if (body.validUntil) {
    // data do formulário (AAAA-MM-DD): vale até o fim do dia, horário de Brasília
    const d = new Date(`${body.validUntil}T23:59:59-03:00`);
    if (Number.isNaN(d.getTime())) return jsonError("invalid_date", "Data de validade inválida.");
    if (d < new Date()) return jsonError("invalid_date", "A validade precisa ser uma data futura.");
    validUntil = d.toISOString();
  }

  try {
    const row = await queryOne(
      `insert into public.coupons (code, percent_off, product_id, valid_until, max_uses, license_days, max_machines, note, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, code`,
      [code, percentOff, productId, validUntil, maxUses, licenseDays, maxMachines, String(body.note || "").slice(0, 200) || null,
        admin.userEmail || null]
    );
    return NextResponse.json({ ok: true, coupon: row });
  } catch (e) {
    if (String(e?.message || "").includes("duplicate")) return jsonError("duplicate", "Já existe um cupom com este código.");
    if (String(e?.message || "").includes("does not exist")) return jsonError("no_table", "Rode a migração neon/migrations/20261103_cupons.sql no Neon.", 500);
    console.error("coupon create failed", e);
    return jsonError("server_error", "Não foi possível criar o cupom.", 500);
  }
}

// Ativa/desativa ({ id, active }).
export async function PATCH(request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const row = await queryOne("update public.coupons set active = $2 where id = $1 returning id", [body.id, Boolean(body.active)]);
  return row ? NextResponse.json({ ok: true }) : jsonError("not_found", "Cupom não encontrado.", 404);
}

// Exclui ({ id }): só cupons que ainda não foram usados (os usados ficam no histórico; desative-os).
export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const rows = await query("delete from public.coupons where id = $1 and uses = 0 returning id", [body.id]);
  return rows.length ? NextResponse.json({ ok: true }) : jsonError("in_use", "Cupom já usado: desative em vez de excluir.");
}
