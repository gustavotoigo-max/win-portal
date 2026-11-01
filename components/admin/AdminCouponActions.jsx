"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminCouponActions({ id, active, used }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function call(method, body) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/coupons", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) window.alert(payload.message || "Não foi possível concluir.");
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="row-actions">
      <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => call("PATCH", { id, active: !active })}>
        {active ? "Desativar" : "Ativar"}
      </button>
      {!used && (confirmDelete ? (
        <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => call("DELETE", { id })}>Confirmar exclusão</button>
      ) : (
        <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Excluir</button>
      ))}
    </div>
  );
}
