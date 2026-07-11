import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { buildLicenseEmail } from "@/lib/email/license-email-template";
import { sendEmail } from "@/lib/email/send-email";
import { encryptLicenseKey, licenseKeyHash } from "@/lib/license-crypto";
import { getProductPage } from "@/lib/product-pages";
import { getProductById } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();

    const userId = profile?.user_id || null;
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: userId,
        order_number: createOrderNumber(product.orderPrefix),
        status: "paid",
        amount: 0,
        currency: "brl",
        customer_email: customerEmail,
        product_id: product.id
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      return jsonError("order_error", orderError.message, 500);
    }

    const licenseKey = createLicenseKey();
    const { data: license, error: licenseError } = await admin
      .from("licenses")
      .insert({
        user_id: userId,
        customer_email: customerEmail,
        order_id: order.id,
        license_key: null,
        license_key_hash: licenseKeyHash(licenseKey),
        license_key_hint: licenseKey.slice(-4),
        license_key_ciphertext: encryptLicenseKey(licenseKey),
        app_id: process.env.LICENSE_APP_ID || "com.winportal.windowssoftware",
        status: "active",
        max_machines: maxMachines,
        expires_at: expiresAt,
        product_id: product.id,
        offline_allowed: true,
        offline_max_days: 30,
        features: ["core"]
      })
      .select("id")
      .single();

    if (licenseError) {
      return jsonError("license_error", licenseError.message, 500);
    }

    await admin.from("license_events").insert({
      license_id: license.id,
      action: "created",
      notes: `Official manual license generated for ${customerEmail}`
    });

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

    await admin.from("license_events").insert({
      license_id: license.id,
      action: emailResult.ok ? "email_sent" : "email_failed",
      notes: emailResult.ok ? `License email sent to ${customerEmail}` : emailResult.message
    });

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
