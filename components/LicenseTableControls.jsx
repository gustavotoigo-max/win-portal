"use client";

import { useState } from "react";

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
