import "server-only";

import { randomUUID } from "node:crypto";
import { encryptLicenseKey, licenseKeyHash } from "@/lib/license-crypto";
import { query, queryOne } from "@/lib/neon/database";

const DEFAULT_APP_ID = "com.winportal.windowssoftware";

// Formato WIN-XXXX-XXXX-XXXX-XXXX, o mesmo usado pelo ADM desde o inicio.
export function createLicenseKey() {
  const raw = randomUUID().replaceAll("-", "").toUpperCase();
  return `WIN-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function createOrderNumber(prefix) {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0")
  ].join("");
  return `${prefix}-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/**
 * Cria um pedido pago e a licenca ativa correspondente.
 * Usado pelo ADM (licenca manual) e pela loja (compra simulada).
 */
export async function issueLicense({
  customerEmail,
  userId = null,
  product,
  maxMachines = 1,
  expiresAt = null,
  order: orderDetails = {},
  eventNote
}) {
  const {
    amount = 0,
    subtotal = null,
    discount = null,
    couponCode = null,
    paymentMethod = "manual"
  } = orderDetails;

  const columns = ["user_id", "order_number", "status", "amount", "currency", "customer_email", "product_id"];
  const values = [userId, createOrderNumber(product.orderPrefix), "paid", amount, "brl", customerEmail, product.id];

  // Colunas da loja (neon/migrations/20261006_simulated_checkout.sql). O ADM nao
  // as envia, entao continua funcionando mesmo antes da migracao ser aplicada.
  if (subtotal !== null) {
    columns.push("subtotal", "discount", "coupon_code", "payment_method");
    values.push(subtotal, discount, couponCode, paymentMethod);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const order = await queryOne(
    `insert into public.orders (${columns.join(", ")})
     values (${placeholders})
     returning id, order_number, created_at`,
    values
  );

  const licenseKey = createLicenseKey();
  const license = await queryOne(
    `insert into public.licenses (
       user_id, customer_email, order_id, license_key, license_key_hash,
       license_key_hint, license_key_ciphertext, app_id, status, max_machines,
       expires_at, product_id, offline_allowed, offline_max_days, features
     )
     values ($1, $2, $3, null, $4, $5, $6, $7, 'active', $8, $9, $10, true, 30, $11::jsonb)
     returning id`,
    [
      userId,
      customerEmail,
      order.id,
      licenseKeyHash(licenseKey),
      licenseKey.slice(-4),
      encryptLicenseKey(licenseKey),
      process.env.LICENSE_APP_ID || DEFAULT_APP_ID,
      maxMachines,
      expiresAt,
      product.id,
      JSON.stringify(["core"])
    ]
  );

  await query(
    `insert into public.license_events (license_id, action, notes)
     values ($1, 'created', $2)`,
    [license.id, eventNote || `License generated for ${customerEmail}`]
  );

  return { order, license, licenseKey };
}

export async function recordLicenseEvent(licenseId, action, notes, adminId = null) {
  await query(
    `insert into public.license_events (license_id, admin_id, action, notes)
     values ($1, $2, $3, $4)`,
    [licenseId, adminId, action, notes]
  );
}
