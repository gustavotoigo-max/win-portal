import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { buildLicenseEmail } from "@/lib/email/license-email-template";
import { sendEmail } from "@/lib/email/send-email";
import { encryptLicenseKey, licenseKeyHash } from "@/lib/license-crypto";
import { getProductPage } from "@/lib/product-pages";
import { getProductById } from "@/lib/products";
import { query, queryOne } from "@/lib/neon/database";

function createLicenseKey() {
  const raw = randomUUID().replaceAll("-", "").toUpperCase();
  return `WIN-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function createOrderNumber(prefix) {
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

function jsonError(code, message, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function calculateExpiration(amount, unit) {
  if (!amount) return null;

  const expiresAt = new Date();
  if (unit === "days") expiresAt.setUTCDate(expiresAt.getUTCDate() + amount);
  if (unit === "months") expiresAt.setUTCMonth(expiresAt.getUTCMonth() + amount);
  if (unit === "years") expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + amount);

  return expiresAt.toISOString();
}

async function requireAdmin() {
  const adminContext = await getAdminContext();

  if (!adminContext.isAuthenticated) {
    return { error: jsonError("auth_required", "Authentication is required.", 401) };
  }

  if (!adminContext.isAdmin) {
    return { error: jsonError("admin_required", "Admin access is required.", 403) };
  }

  return { user: adminContext.user };
}

export async function POST(request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const customerEmail = String(body.email || "").trim().toLowerCase();
    const maxMachines = Math.max(1, Math.min(Number(body.maxMachines) || 1, 10));
    const product = getProductById(body.productId);
    const validityAmount = Number(body.validityAmount) > 0 ? Number(body.validityAmount) : null;
    const validityUnit = ["days", "months", "years"].includes(body.validityUnit)
      ? body.validityUnit
      : "months";
    const expiresAt = calculateExpiration(validityAmount, validityUnit);

    if (!customerEmail || !customerEmail.includes("@")) {
      return jsonError("invalid_email", "Informe um e-mail valido.", 400);
    }

    const profile = await queryOne(
      "select user_id from public.profiles where lower(email) = lower($1)",
      [customerEmail]
    );

    const userId = profile?.user_id || null;
    const order = await queryOne(
      `insert into public.orders (
         user_id, order_number, status, amount, currency, customer_email, product_id
       )
       values ($1, $2, 'paid', 0, 'brl', $3, $4)
       returning id, order_number`,
      [userId, createOrderNumber(product.orderPrefix), customerEmail, product.id]
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
        process.env.LICENSE_APP_ID || "com.winportal.windowssoftware",
        maxMachines,
        expiresAt,
        product.id,
        JSON.stringify(["core"])
      ]
    );

    await query(
      `insert into public.license_events (license_id, action, notes)
       values ($1, 'created', $2)`,
      [license.id, `Official manual license generated for ${customerEmail}`]
    );

    const productPage = getProductPage(product.id);
    const downloadUrl = new URL(`/pt/solucoes/${product.id}`, request.url).toString();
    const emailTemplate = buildLicenseEmail({
      customerEmail,
      licenseKey,
      orderNumber: order.order_number,
      product: productPage,
      expiresAt,
      downloadUrl
    });
    const emailResult = await sendEmail({
      to: customerEmail,
      ...emailTemplate
    });

    await query(
      `insert into public.license_events (license_id, action, notes)
       values ($1, $2, $3)`,
      [
        license.id,
        emailResult.ok ? "email_sent" : "email_failed",
        emailResult.ok ? `License email sent to ${customerEmail}` : emailResult.message
      ]
    );

    return NextResponse.json({
      ok: true,
      licenseId: license.id,
      licenseKey,
      emailSent: emailResult.ok,
      emailMessage: emailResult.ok ? "E-mail enviado ao cliente." : emailResult.message
    });
  } catch (error) {
    return jsonError("server_error", error.message, 500);
  }
}
