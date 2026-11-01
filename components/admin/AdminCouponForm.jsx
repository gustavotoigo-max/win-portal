"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { products } from "@/lib/products";

// Cadastro de cupom: código, % de desconto, validade, limite de usos e (opcional) prazo da licença gerada.
export default function AdminCouponForm() {
  const router = useRouter();
  const empty = { code: "", percentOff: 100, validUntil: "", maxUses: "", licenseDays: "", maxMachines: 1, productId: products[0]?.id || "", note: "" };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: k === "code" ? e.target.value.toUpperCase() : e.target.value });

  function randomCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const part = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
    setForm({ ...form, code: `TESTE-${part()}` });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) {
        setMessage({ type: "error", text: payload.message || "Não foi possível criar o cupom." });
        return;
      }
      setMessage({ type: "success", text: `Cupom ${payload.coupon.code} criado.` });
      setForm(empty);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Não foi possível criar o cupom." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-create-form coupon-create-form" onSubmit={submit}>
      <div>
        <label htmlFor="cp-code">Código</label>
        <div className="input-with-button">
          <input id="cp-code" value={form.code} onChange={set("code")} placeholder="TESTE-AB12" required />
          <button className="btn btn-ghost btn-sm" type="button" onClick={randomCode}>Gerar</button>
        </div>
      </div>
      <div>
        <label htmlFor="cp-percent">Desconto (%)</label>
        <input id="cp-percent" type="number" min="1" max="100" value={form.percentOff} onChange={set("percentOff")} required />
      </div>
      <div>
        <label htmlFor="cp-until">Válido até</label>
        <input id="cp-until" type="date" value={form.validUntil} onChange={set("validUntil")} title="Vazio: sem prazo" />
      </div>
      <div>
        <label htmlFor="cp-uses">Limite de usos</label>
        <input id="cp-uses" type="number" min="1" value={form.maxUses} onChange={set("maxUses")} placeholder="sem limite" />
      </div>
      <div>
        <label htmlFor="cp-days">Licença por (dias)</label>
        <input id="cp-days" type="number" min="1" value={form.licenseDays} onChange={set("licenseDays")} placeholder="sem prazo" title="Prazo da licença gerada com este cupom. Vazio: licença sem prazo." />
      </div>
      <div>
        <label htmlFor="cp-machines">Computadores</label>
        <input id="cp-machines" type="number" min="1" max="10" value={form.maxMachines} onChange={set("maxMachines")} required />
      </div>
      <div>
        <label htmlFor="cp-product">Produto</label>
        <select id="cp-product" value={form.productId} onChange={set("productId")}>
          <option value="">Todos</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="coupon-note">
        <label htmlFor="cp-note">Anotação</label>
        <input id="cp-note" value={form.note} onChange={set("note")} placeholder="ex.: testadores de novembro" maxLength={200} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Criando..." : "Criar cupom"}</button>
      {message && <p className={`form-message ${message.type}`}>{message.text}</p>}
    </form>
  );
}
