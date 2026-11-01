"use client";

import { useState } from "react";

export default function AdminEmailTest() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/emails", { method: "POST" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, message: "Não foi possível chamar o teste." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary" type="button" disabled={busy} onClick={send}>
        {busy ? "Enviando..." : "Enviar e-mail de teste para mim"}
      </button>
      {result && (
        <div className={`form-message ${result.ok ? "success" : "error"}`} style={{ marginTop: 12 }}>
          {result.ok ? `Enviado para ${result.to}. Confira a caixa de entrada (e o spam).` : (result.message || "Falhou.")}
          {result.config && (
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(result.config, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
