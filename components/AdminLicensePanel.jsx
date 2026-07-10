"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LicenseKeyCell } from "@/components/LicenseTableControls";
import { statusClass } from "@/lib/demo-data";

const pageSize = 100;

export default function AdminLicensePanel({ licenses, dictionary }) {
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
      text: payload.message || payload.error || dictionary.admin.actionError
    });

    if (response.ok && payload.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <>
      <div className="admin-license-search">
        <label htmlFor="license-search">{dictionary.admin.licenseSearch}</label>
        <input
          id="license-search"
          type="search"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder={dictionary.admin.licenseSearchPlaceholder}
        />
      </div>

      {message && <p className={`operation-message ${message.type}`}>{message.text}</p>}

      <div className="admin-license-list" aria-busy={isPending}>
        {visibleLicenses.length ? (
          visibleLicenses.map((license, index) => (
            <details className="admin-license-card" key={license.id} defaultOpen={currentPage === 1 && index === 0}>
              <summary className="license-card-summary" title={dictionary.admin.expandHint}>
                <div className="summary-user">
                  <span className="summary-chevron" aria-hidden="true" />
                  <span className="field-label">{dictionary.admin.user}</span>
                  <strong>{license.user}</strong>
                </div>
                <span className={statusClass(license.status)}>{license.status}</span>
              </summary>

              <div className="license-card-body">
                <div className="license-card-key">
                  <span className="field-label">{dictionary.admin.license}</span>
                  <LicenseKeyCell licenseKey={license.key} dictionary={dictionary} />
                </div>

                <div className="license-detail-grid">
                  <div><span className="field-label">{dictionary.admin.product}</span><strong>{license.product}</strong></div>
                  <div><span className="field-label">{dictionary.admin.maxMachines}</span><strong>{license.maxMachines}</strong></div>
                  <div><span className="field-label">{dictionary.admin.expiresAt}</span><strong>{license.expiresAt}</strong></div>
                  <div><span className="field-label">{dictionary.admin.machineName}</span><strong>{license.machineName}</strong></div>
                  <div><span className="field-label">{dictionary.admin.softwareVersion}</span><strong>{license.softwareVersion}</strong></div>
                  <div><span className="field-label">{dictionary.admin.activatedAt}</span><strong>{license.activatedAt}</strong></div>
                  <div><span className="field-label">{dictionary.admin.lastSeen}</span><strong>{license.lastSeen}</strong></div>
                  <div><span className="field-label">{dictionary.admin.lastValidation}</span><strong>{license.lastValidation}</strong></div>
                  <div><span className="field-label">{dictionary.admin.lastIp}</span><strong>{license.lastIp}</strong></div>
                  <div><span className="field-label">{dictionary.admin.order}</span><strong>{license.order}</strong></div>
                  <div><span className="field-label">{dictionary.admin.createdAt}</span><strong>{license.createdAt}</strong></div>
                </div>

                <div className="machine-id-block">
                  <span className="field-label">{dictionary.admin.machineId}</span>
                  <code>{license.machineId}</code>
                </div>

                <div className="admin-actions license-card-actions">
                  {[
                    ["active", dictionary.admin.activate, dictionary.admin.activateHint],
                    ["clear_activation", dictionary.admin.clearActivation, dictionary.admin.clearActivationHint],
                    ["revoked", dictionary.admin.revoke, dictionary.admin.revokeHint],
                    ["blocked", dictionary.admin.block, dictionary.admin.blockHint]
                  ].map(([action, label, hint]) => (
                    <button
                      className={action === "blocked" ? "btn danger" : "btn secondary"}
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
          <p className="note">{dictionary.admin.empty}</p>
        )}
      </div>

      <nav className="license-pagination" aria-label={dictionary.admin.pagination}>
        <button
          className="btn secondary"
          type="button"
          title={dictionary.admin.previousPage}
          disabled={currentPage <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          {dictionary.admin.previousPage}
        </button>
        <span>{dictionary.admin.pageOf.replace("{page}", currentPage).replace("{total}", totalPages)}</span>
        <button
          className="btn secondary"
          type="button"
          title={dictionary.admin.nextPage}
          disabled={currentPage >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          {dictionary.admin.nextPage}
        </button>
      </nav>

      {confirmAction && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <p className="eyebrow">{dictionary.admin.confirmTitle}</p>
            <h2 id="confirm-title">{confirmAction.label}</h2>
            <p>{dictionary.admin.confirmText}</p>
            <div className="confirm-summary">
              <span>{dictionary.admin.user}</span>
              <strong>{confirmAction.license.user}</strong>
              <span>{dictionary.admin.license}</span>
              <code>{confirmAction.license.key}</code>
            </div>
            <div className="button-row compact">
              <button className="btn primary" type="button" title={confirmAction.hint} onClick={runAction}>
                {dictionary.admin.confirm}
              </button>
              <button className="btn secondary" type="button" title={dictionary.admin.cancelHint} onClick={() => setConfirmAction(null)}>
                {dictionary.admin.cancel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
