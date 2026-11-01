import { NextResponse } from "next/server";
import { findCoupon, quoteOrder } from "@/lib/coupons";
import { isDatabaseConfigured } from "@/lib/neon/database";
import { getPricedProduct } from "@/lib/prices";
import { getProductOrNull, isStoreProduct } from "@/lib/products";

// Confere o cupom antes da compra (mostra o desconto). O uso só é registrado ao concluir.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const product = await getPricedProduct(getProductOrNull(body.productId));

  if (!isStoreProduct(product)) {
    return NextResponse.json({ ok: false, message: "Produto não encontrado." }, { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: "Banco de dados não configurado." }, { status: 503 });
  }

  const coupon = await findCoupon(body.coupon, product.id).catch(() => null);
  if (!coupon) {
    return NextResponse.json({ ok: false, message: "Cupom inválido ou expirado." }, { status: 400 });
  }

  const quote = quoteOrder(product, coupon);
  return NextResponse.json({
    ok: true,
    coupon: {
      code: coupon.code,
      label: coupon.label,
      percentOff: coupon.percentOff,
      licenseDays: coupon.licenseDays
    },
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total
  });
}
