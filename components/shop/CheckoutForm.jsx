"use client";

import { useState } from "react";
import Icon from "@/components/site/Icon";

function money(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function CheckoutForm({ product, email }) {
  const subtotal = Math.round(product.price * 100);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const discount = coupon?.discount || 0;
  const total = Math.max(0, subtotal - discount);
  const canFinish = total === 0;

  async function applyCoupon(event) {
    event.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplying(true);
    setCouponMessage(null);
    try {
      const response = await fetch("/api/compra/cupom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, coupon: couponInput })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setCoupon(null);
        setCouponMessage({ type: "error", text: payload.message || "Cupom inválido." });
        return;
      }
      setCoupon({ code: payload.coupon.code, label: payload.coupon.label, discount: payload.discount });
      setCouponMessage({ type: "success", text: `${payload.coupon.label} aplicado.` });
    } catch {
      setCouponMessage({ type: "error", text: "Não foi possível validar o cupom agora." });
    } finally {
      setIsApplying(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  }

  async function finish() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/compra", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, coupon: coupon?.code || "" })
      });
      const payload = await response.json();
      if (response.status === 401) {
        window.location.href = `/pt/login?next=${encodeURIComponent(`/pt/comprar/${product.id}`)}`;
        return;
      }
      if (!response.ok || !payload.ok) {
        setError(payload.message || "Não foi possível concluir a compra.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = `/pt/compra-concluida?pedido=${encodeURIComponent(payload.orderNumber)}`;
    } catch {
      setError("Não foi possível concluir a compra agora. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="checkout-main">
      <section className="panel">
        <h2 className="panel-title"><span className="panel-step">1</span> Conta</h2>
        <div className="account-line">
          <Icon name="user" size={18} />
          <span>Comprando como <strong>{email}</strong></span>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title"><span className="panel-step">2</span> Cupom de desconto</h2>
        {coupon ? (
          <div className="coupon-applied">
            <Icon name="tag" size={18} />
            <span><strong>{coupon.code}</strong> aplicado</span>
            <button className="link-button" type="button" onClick={removeCoupon}>Remover</button>
          </div>
        ) : (
          <form className="coupon-form" onSubmit={applyCoupon}>
            <label className="sr-only" htmlFor="coupon">Código do cupom</label>
            <input
              id="coupon"
              autoComplete="off"
              placeholder="Digite o código do cupom"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
            />
            <button className="btn btn-ghost" type="submit" disabled={isApplying || !couponInput.trim()}>
              {isApplying ? "Validando..." : "Aplicar"}
            </button>
          </form>
        )}
        {couponMessage && <p className={`form-message ${couponMessage.type}`}>{couponMessage.text}</p>}
      </section>

      <section className="panel">
        <h2 className="panel-title"><span className="panel-step">3</span> Pagamento</h2>
        {canFinish ? (
          <div className="payment-free">
            <Icon name="check" size={18} />
            <span>Nenhum pagamento necessário. O cupom cobre o valor total do pedido.</span>
          </div>
        ) : (
          <div className="payment-soon">
            <Icon name="lock" size={18} />
            <div>
              <strong>Pagamento online em breve</strong>
              <span>Cartão e Pix ainda não estão disponíveis nesta loja. Para concluir agora, aplique um cupom válido.</span>
            </div>
          </div>
        )}
      </section>

      <section className="panel totals">
        <dl>
          <div><dt>{product.title}</dt><dd>{money(subtotal)}</dd></div>
          {discount > 0 && (
            <div className="discount"><dt>Desconto ({coupon.code})</dt><dd>− {money(discount)}</dd></div>
          )}
          <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
        {error && <p className="form-message error">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" type="button" disabled={!canFinish || isSubmitting} onClick={finish}>
          {isSubmitting ? "Concluindo..." : canFinish ? "Concluir compra" : `Pagar ${money(total)}`}
        </button>
        <p className="muted small center">Loja em modo de demonstração: nenhum valor é cobrado.</p>
      </section>
    </div>
  );
}
