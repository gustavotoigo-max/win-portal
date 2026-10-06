"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function ReleaseMachineButton({ activationId, machineName }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  async function release() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/conta/ativacoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activationId })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message || "Não foi possível desvincular.");
        return;
      }
      setConfirming(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Não foi possível desvincular.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button className="link-button" type="button" onClick={() => setConfirming(true)}>
        Desvincular
      </button>
    );
  }

  return (
    <div className="inline-confirm" role="alertdialog" aria-label={`Desvincular ${machineName}`}>
      <span>O aplicativo deixará de funcionar em {machineName}. Confirmar?</span>
      <button className="btn btn-danger btn-sm" type="button" disabled={isLoading || isPending} onClick={release}>
        {isLoading || isPending ? "Desvinculando..." : "Desvincular"}
      </button>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
      {error && <span className="form-message error">{error}</span>}
    </div>
  );
}
