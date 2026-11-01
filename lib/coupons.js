import "server-only";

import { query, queryOne } from "@/lib/neon/database";

// Cupons ficam no banco (public.coupons) e são cadastrados no ADM.
// Um cupom vale se estiver ativo, dentro do prazo, com usos disponíveis e para o produto (ou para todos).

export function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}

const VALID = `
  active
  and now() >= valid_from
  and (valid_until is null or now() <= valid_until)
  and (max_uses is null or uses < max_uses)`;

function shape(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    productId: row.product_id,
    licenseDays: row.license_days,
    maxMachines: row.max_machines,
    label: `Cupom ${row.code} (${row.percent_off}% de desconto)`
  };
}

/** Cupom válido para o produto, ou null. */
export async function findCoupon(code, productId) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const row = await queryOne(
    `select * from public.coupons where code = $1 and ${VALID} and (product_id is null or product_id = $2)`,
    [normalized, productId]
  );
  return shape(row);
}

// Valores em centavos.
export function quoteOrder(product, coupon) {
  const subtotal = Math.round(product.price * 100);
  const discount = coupon ? Math.round((subtotal * coupon.percentOff) / 100) : 0;
  return { subtotal, discount, total: Math.max(0, subtotal - discount), coupon };
}

/**
 * Reserva um uso do cupom para a conta (atômico: prazo, limite e "um uso por conta" conferidos na mesma instrução).
 * Devolve o cupom ou null se não puder mais ser usado por esta conta.
 */
export async function redeemCoupon(code, productId, userId, email) {
  const row = await queryOne(
    `with c as (
       update public.coupons set uses = uses + 1
        where code = $1 and ${VALID} and (product_id is null or product_id = $2)
          and not exists (select 1 from public.coupon_redemptions r where r.coupon_id = coupons.id and r.user_id = $3)
        returning *
     ), r as (
       insert into public.coupon_redemptions (coupon_id, user_id, customer_email)
       select id, $3, $4 from c
       on conflict (coupon_id, user_id) do nothing
       returning coupon_id
     )
     select c.* from c join r on r.coupon_id = c.id`,
    [normalizeCouponCode(code), productId, userId, email]
  );
  return shape(row);
}

/** Devolve o uso reservado (a compra não terminou). */
export async function releaseCoupon(couponId, userId) {
  await query(
    `with d as (delete from public.coupon_redemptions where coupon_id = $1 and user_id = $2 returning coupon_id)
     update public.coupons set uses = greatest(0, uses - 1) where id in (select coupon_id from d)`,
    [couponId, userId]
  );
}

export async function attachOrderToRedemption(couponId, userId, orderNumber) {
  await query("update public.coupon_redemptions set order_number = $3 where coupon_id = $1 and user_id = $2", [couponId, userId, orderNumber]);
}

/** Esta conta já usou este cupom? (para avisar antes de tentar) */
export async function alreadyRedeemed(couponId, userId) {
  return Boolean(await queryOne("select 1 from public.coupon_redemptions where coupon_id = $1 and user_id = $2", [couponId, userId]));
}
