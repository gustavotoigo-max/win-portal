import "server-only";

// Cupons da compra simulada. Os codigos ficam apenas no servidor.
const coupons = {
  COMPREAQUI: { percentOff: 100, label: "Cupom COMPREAQUI (100% de desconto)" }
};

export function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}

export function findCoupon(code) {
  const normalized = normalizeCouponCode(code);
  const coupon = coupons[normalized];
  return coupon ? { code: normalized, ...coupon } : null;
}

// Valores em centavos.
export function quoteOrder(product, couponCode) {
  const subtotal = Math.round(product.price * 100);
  const coupon = couponCode ? findCoupon(couponCode) : null;
  const discount = coupon ? Math.round((subtotal * coupon.percentOff) / 100) : 0;

  return {
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    coupon
  };
}
