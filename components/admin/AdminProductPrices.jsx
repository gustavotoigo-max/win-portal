"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function money(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function PriceRow({ product }) {
  const router = useRouter();
  const [value, setValue] = useState(product.priceCents == null ? "" : (product.priceCents / 100).toFixed(2).replace(".", ","));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, price: value })
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setMessage({ type: "error", text: payload.message || "Não foi possível salvar." });
        return;
      }
      setMessage({ type: "success", text: `Salvo: ${money(payload.priceCents)}` });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  }

  const isNew = product.priceCents == null;
  return (
    <form className={`price-row${isNew ? " price-row-new" : ""}`} onSubmit={save}>
      <div className="price-row-product">
        {product.iconImage ? <Image src={product.iconImage} alt="" width={36} height={36} unoptimized /> : null}
        <div>
          <strong>{product.name}</strong>
          <small className="muted">
            {isNew ? "Produto novo: defina o valor (no site aparece R$ 0,00)" : `Atual: ${money(product.priceCents)}`}
            {product.pagePath ? <> · <a href={product.pagePath} target="_blank" rel="noreferrer">ver página</a></> : null}
          </small>
        </div>
        {isNew ? <span className="status status-pending">Sem preço</span> : null}
      </div>
      <label className="sr-only" htmlFor={`price-${product.id}`}>Valor de {product.name}</label>
      <div className="price-input">
        <span>R$</span>
        <input id={`price-${product.id}`} inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
      {message && <p className={`form-message ${message.type}`}>{message.text}</p>}
    </form>
  );
}

export default function AdminProductPrices({ products, missingTable }) {
  if (missingTable) {
    return <p className="muted">Rode <code>neon/migrations/20261104_precos.sql</code> no SQL Editor do Neon (branch dev) para editar os preços.</p>;
  }
  return (
    <div className="price-list">
      {products.map((p) => <PriceRow key={p.id} product={p} />)}
    </div>
  );
}
