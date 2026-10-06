"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LicenseKey } from "@/components/account/LicenseKey";
import { adminTexts as t, statusText } from "@/lib/admin-texts";

const pageSize = 100;

export default function AdminLicensePanel({ licenses }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isPending, startTransition] = useTransition();

  const filteredLicenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return licenses;
    return licenses.filter((license) => license.searchText.includes(term));
  }, [licenses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLicenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLicenses = filteredLicenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  async function runAction() {
    if (!confirmAction) return;
    setMessage(null);

    const response = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        licenseId: confirmAction.license.id,
        action: confirmAction.action
      })
    });
    const payload = await response.json();

    setConfirmAction(null);
    setMessage({
      type: response.ok && payload.ok ? "success" : "error",
      text: payload.message || payload.error || t.actionError
    });

    if (response.ok && payload.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <>
      <div className="admin-license-search">
        <label htmlFor="license-search">{t.licenseSearch}</label>
        <input
          id="license-search"
          type="search"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder={t.licenseSearchPlaceholder}
        />
      </div>

      {message && <p className={`form-message ${message.type}`}>{message.text}</p>}

      <div className="admin-license-list" aria-busy={isPending}>
        {visibleLicenses.length ? (
          visibleLicenses.map((license) => (
            <details className="admin-license-card" key={license.id}>
              <summary className="license-card-summary" title={t.expandHint}>
                <div className="summary-user">
                  <span className="summary-chevron" aria-hidden="true" />
                  <span className="field-label">{t.user}</span>
                  <strong>{license.user}</strong>
                </div>
                <div className="summary-meta">
                  <span className="field-label">{t.product}</span>
                  <strong>{license.product}</strong>
                </div>
                <div className="summary-meta">
                  <span className="field-label">{t.expiresAt}</span>
                  <strong>{license.expiresAt}</strong>
                </div>
                <span className={`status status-${license.status}`}>{statusText[license.status] || license.status}</span>
              </summary>

              <div className="license-card-body">
                <div className="license-card-key">
                  <span className="field-label">{t.license}</span>
                  <LicenseKey licenseKey={license.key} />
                </div>

                <div className="license-detail-grid">
                  <div><span className="field-label">{t.product}</span><strong>{license.product}</strong></div>
                  <div><span className="field-label">{t.maxMachines}</span><strong>{license.maxMachines}</strong></div>
                  <div><span className="field-label">{t.expiresAt}</span><strong>{license.expiresAt}</strong></div>
                  <div><span className="field-label">{t.machineName}</span><strong>{license.machineName}</strong></div>
                  <div><span className="field-label">{t.softwareVersion}</span><strong>{license.softwareVersion}</strong></div>
                  <div><span className="field-label">{t.activatedAt}</span><strong>{license.activatedAt}</strong></div>
                  <div><span className="field-label">{t.lastSeen}</span><strong>{license.lastSeen}</strong></div>
                  <div><span className="field-label">{t.lastValidation}</span><strong>{license.lastValidation}</strong></div>
                  <div><span className="field-label">{t.lastIp}</span><strong>{license.lastIp}</strong></div>
                  <div><span className="field-label">{t.order}</span><strong>{license.order}</strong></div>
                  <div><span className="field-label">{t.createdAt}</span><strong>{license.createdAt}</strong></div>
                </div>

                <div className="machine-id-block">
                  <span className="field-label">{t.machineId}</span>
                  <code>{license.machineId}</code>
                </div>

                <div className="admin-actions license-card-actions">
                  {[
                    ["active", t.activate, t.activateHint],
                    ["clear_activation", t.clearActivation, t.clearActivationHint],
                    ["revoked", t.revoke, t.revokeHint],
                    ["blocked", t.block, t.blockHint]
                  ].map(([action, label, hint]) => (
                    <button
                      className={action === "blocked" ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}
                      key={action}
                      type="button"
                      title={hint}
                      onClick={() => setConfirmAction({ action, label, hint, license })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          ))
        ) : (
          <p className="muted">{t.empty}</p>
        )}
      </div>

      <nav className="license-pagination" aria-label={t.pagination}>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          title={t.previousPage}
          disabled={currentPage <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          {t.previousPage}
        </button>
        <span>{t.pageOf.replace("{page}", currentPage).replace("{total}", totalPages)}</span>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          title={t.nextPage}
          disabled={currentPage >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          {t.nextPage}
        </button>
      </nav>

      {confirmAction && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <p className="eyebrow">{t.confirmTitle}</p>
            <h2 id="confirm-title">{confirmAction.label}</h2>
            <p>{t.confirmText}</p>
            <div className="confirm-summary">
              <span>{t.user}</span>
              <strong>{confirmAction.license.user}</strong>
              <span>{t.license}</span>
              <code>{confirmAction.license.key}</code>
            </div>
            <div className="button-row compact">
              <button className="btn btn-primary btn-sm" type="button" title={confirmAction.hint} onClick={runAction}>
                {t.confirm}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" title={t.cancelHint} onClick={() => setConfirmAction(null)}>
                {t.cancel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
