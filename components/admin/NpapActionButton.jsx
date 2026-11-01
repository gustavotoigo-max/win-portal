"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Botão de ação do servidor NPAPcore com confirmação na própria linha.
 * endpoint: "/api/admin/npap" (ADM) ou "/api/conta/computadores" (cliente).
 */
export default function NpapActionButton({ endpoint = "/api/admin/npap", body, label, confirmText, danger = false }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      setMessage({ type: response.ok && payload.ok ? "success" : "error", text: payload.message || "Não foi possível concluir." });
      if (response.ok && payload.ok) {
        setConfirming(false);
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage({ type: "error", text: "Não foi possível concluir." });
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <span className="npap-action">
        <button className={danger ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"} type="button" onClick={() => setConfirming(true)}>
          {label}
        </button>
        {message && <span className={`form-message ${message.type}`}>{message.text}</span>}
      </span>
    );
  }

  return (
    <span className="inline-confirm npap-action" role="alertdialog" aria-label={label}>
      <span>{confirmText}</span>
      <button className={danger ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"} type="button" disabled={loading || isPending} onClick={run}>
        {loading || isPending ? "Aguarde..." : "Confirmar"}
      </button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
      {message && <span className={`form-message ${message.type}`}>{message.text}</span>}
    </span>
  );
}
