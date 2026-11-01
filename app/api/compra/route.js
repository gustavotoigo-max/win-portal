import { NextResponse } from "next/server";
import { alreadyRedeemed, attachOrderToRedemption, findCoupon, quoteOrder, redeemCoupon, releaseCoupon } from "@/lib/coupons";
import { buildLicenseEmail } from "@/lib/email/license-email-template";
import { sendEmail } from "@/lib/email/send-email";
import { issueLicense, recordLicenseEvent } from "@/lib/licenses/issue";
import { isDatabaseConfigured } from "@/lib/neon/database";
import { getProductPage } from "@/lib/product-pages";
import { getProductOrNull, isStoreProduct, productPath } from "@/lib/products";
import { ensureProfile, getCurrentUser } from "@/lib/session";

function jsonError(code, message, status) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// Sem gateway de pagamento por enquanto: a compra só conclui com um cupom válido que zere o total.
// O cupom é cadastrado no ADM (prazo, % de desconto, limite de usos, prazo da licença).
export async function POST(request) {
  let reserved = null;
  let user = null;
  try {
    user = await getCurrentUser();
    if (!user?.email) {
      return jsonError("auth_required", "Entre na sua conta para concluir a compra.", 401);
    }

    if (!isDatabaseConfigured()) {
      return jsonError("database_unavailable", "Banco de dados não configurado.", 503);
    }

    const body = await request.json().catch(() => ({}));
    const product = getProductOrNull(body.productId);
    if (!isStoreProduct(product)) {
      return jsonError("invalid_product", "Produto não encontrado.", 404);
    }

    if (!String(body.coupon || "").trim()) {
      return jsonError("coupon_required", "Informe o seu cupom para ativar a licença.", 400);
    }

    const coupon = await findCoupon(body.coupon, product.id);
    if (!coupon) {
      return jsonError("invalid_coupon", "Cupom inválido ou expirado.", 400);
    }
    if (await alreadyRedeemed(coupon.id, user.id)) {
      return jsonError("coupon_used", "Você já usou este cupom.", 400);
    }

    const quote = quoteOrder(product, coupon);
    if (quote.total > 0) {
      return jsonError(
        "payment_unavailable",
        "O pagamento online ainda não está disponível. Use um cupom de 100% para ativar a licença.",
        402
      );
    }

    // reserva o uso (prazo, limite e uso único conferidos de forma atômica)
    reserved = await redeemCoupon(coupon.code, product.id, user.id, String(user.email).trim().toLowerCase());
    if (!reserved) {
      return jsonError("invalid_coupon", "Este cupom não pode mais ser usado.", 400);
    }

    const customerEmail = String(user.email).trim().toLowerCase();
    await ensureProfile(user);

    const expiresAt = reserved.licenseDays
      ? new Date(Date.now() + reserved.licenseDays * 86400000).toISOString()
      : null;

    const { order, license, licenseKey } = await issueLicense({
      customerEmail,
      userId: user.id,
      product,
      maxMachines: reserved.maxMachines || 1,
      expiresAt,
      order: {
        amount: quote.total,
        subtotal: quote.subtotal,
        discount: quote.discount,
        couponCode: reserved.code,
        paymentMethod: "cupom"
      },
      eventNote: `Coupon purchase by ${customerEmail} with coupon ${reserved.code}`
    });
    await attachOrderToRedemption(reserved.id, user.id, order.order_number);
    const done = reserved;
    reserved = null;

    const productPage = getProductPage(product.id);
    const emailResult = await sendEmail({
      to: customerEmail,
      ...buildLicenseEmail({
        customerEmail,
        licenseKey,
        orderNumber: order.order_number,
        product: productPage,
        expiresAt,
        downloadUrl: new URL(productPage.downloadUrl, request.url).toString(),
        productUrl: new URL(productPath(product.id), request.url).toString(),
        maxMachines: done.maxMachines || 1
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
    console.error("Coupon purchase failed:", error);
    if (reserved && user) await releaseCoupon(reserved.id, user.id).catch(() => {});
    return jsonError("server_error", "Não foi possível concluir a compra agora. Tente novamente.", 500);
  }
}
