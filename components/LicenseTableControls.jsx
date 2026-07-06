"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function LicenseKeyCell({ licenseKey, dictionary }) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="license-key-cell">
      <code>{licenseKey}</code>
      <button className="btn secondary table-action-btn" type="button" onClick={copyKey}>
        {copied ? dictionary.dashboard.copied : dictionary.dashboard.copy}
      </button>
    </div>
  );
}

export function LicenseStatusButton({ licenseId, currentStatus, action, label, variant = "secondary", dictionary }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const disabled = isLoading || currentStatus === action;

  async function updateStatus() {
    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        window.location.reload();
        return;
      }

      const response = await fetch("/api/licenses/status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ licenseId, action })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setMessage(payload.message || dictionary.dashboard.actionError);
        return;
      }

      router.refresh();
    } catch {
      setMessage(dictionary.dashboard.actionError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="table-action-stack">
      <button className={`btn ${variant} table-action-btn`} type="button" onClick={updateStatus} disabled={disabled}>
        {isLoading ? dictionary.dashboard.updating : label}
      </button>
      {message && <span className="table-action-error">{message}</span>}
    </div>
  );
}
