import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { buildLicenseEmail } from "@/lib/email/license-email-template";
import { sendEmail } from "@/lib/email/send-email";
import { issueLicense, recordLicenseEvent } from "@/lib/licenses/issue";
import { getProductPage } from "@/lib/product-pages";
import { getProductById } from "@/lib/products";
import { queryOne } from "@/lib/neon/database";

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
    const { order, license, licenseKey } = await issueLicense({
      customerEmail,
      userId,
      product,
      maxMachines,
      expiresAt,
      eventNote: `Official manual license generated for ${customerEmail}`
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

    await recordLicenseEvent(
      license.id,
      emailResult.ok ? "email_sent" : "email_failed",
      emailResult.ok ? `License email sent to ${customerEmail}` : emailResult.message
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
