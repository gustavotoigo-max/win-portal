import { NextResponse } from "next/server";
import { findCoupon, quoteOrder } from "@/lib/coupons";
import { getProductOrNull } from "@/lib/products";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const product = getProductOrNull(body.productId);

  if (!product) {
    return NextResponse.json({ ok: false, message: "Produto não encontrado." }, { status: 404 });
  }

  const coupon = findCoupon(body.coupon);
  if (!coupon) {
    return NextResponse.json({ ok: false, message: "Cupom inválido ou expirado." }, { status: 400 });
  }

  const quote = quoteOrder(product, coupon.code);
  return NextResponse.json({
    ok: true,
    coupon: { code: coupon.code, label: coupon.label, percentOff: coupon.percentOff },
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total
  });
}
