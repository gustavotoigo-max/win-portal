"use client";

import { useState } from "react";

export function LicenseKey({ licenseKey, large = false }) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`license-key${large ? " license-key-lg" : ""}`}>
      <code>{licenseKey}</code>
      <button className="btn btn-ghost btn-sm" type="button" onClick={copyKey}>
        {copied ? "Copiada" : "Copiar"}
      </button>
    </div>
  );
}

export default LicenseKey;
