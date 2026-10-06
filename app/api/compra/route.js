import { NextResponse } from "next/server";
import { quoteOrder, findCoupon } from "@/lib/coupons";
import { buildLicenseEmail } from "@/lib/email/license-email-template";
import { sendEmail } from "@/lib/email/send-email";
import { issueLicense, recordLicenseEvent } from "@/lib/licenses/issue";
import { isDatabaseConfigured } from "@/lib/neon/database";
import { getProductPage } from "@/lib/product-pages";
import { getProductOrNull } from "@/lib/products";
import { ensureProfile, getCurrentUser } from "@/lib/session";

function jsonError(code, message, status) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// Compra simulada: nao ha gateway de pagamento. Um pedido so e concluido
// quando o cupom zera o total (ex.: COMPREAQUI).
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return jsonError("auth_required", "Entre na sua conta para concluir a compra.", 401);
    }

    if (!isDatabaseConfigured()) {
      return jsonError("database_unavailable", "Banco de dados não configurado.", 503);
    }

    const body = await request.json().catch(() => ({}));
    const product = getProductOrNull(body.productId);
    if (!product) {
      return jsonError("invalid_product", "Produto não encontrado.", 404);
    }

    if (body.coupon && !findCoupon(body.coupon)) {
      return jsonError("invalid_coupon", "Cupom inválido ou expirado.", 400);
    }

    const quote = quoteOrder(product, body.coupon);
    if (quote.total > 0) {
      return jsonError(
        "payment_unavailable",
        "O pagamento online ainda não está disponível. Aplique um cupom válido para concluir a compra.",
        402
      );
    }

    const customerEmail = String(user.email).trim().toLowerCase();
    await ensureProfile(user);

    const { order, license, licenseKey } = await issueLicense({
      customerEmail,
      userId: user.id,
      product,
      maxMachines: 1,
      expiresAt: null,
      order: {
        amount: quote.total,
        subtotal: quote.subtotal,
        discount: quote.discount,
        couponCode: quote.coupon?.code || null,
        paymentMethod: "simulado"
      },
      eventNote: `Simulated purchase by ${customerEmail}${quote.coupon ? ` with coupon ${quote.coupon.code}` : ""}`
    });

    const productPage = getProductPage(product.id);
    const emailResult = await sendEmail({
      to: customerEmail,
      ...buildLicenseEmail({
        customerEmail,
        licenseKey,
        orderNumber: order.order_number,
        product: productPage,
        expiresAt: null,
        downloadUrl: new URL(`/pt/solucoes/${product.id}`, request.url).toString()
      })
    });

    if (!emailResult.skipped) {
      await recordLicenseEvent(
        license.id,
        emailResult.ok ? "email_sent" : "email_failed",
        emailResult.ok ? `License email sent to ${customerEmail}` : emailResult.message
      );
    }

    return NextResponse.json({ ok: true, orderNumber: order.order_number });
  } catch (error) {
    console.error("Simulated purchase failed:", error);
    return jsonError("server_error", "Não foi possível concluir a compra agora. Tente novamente.", 500);
  }
}
