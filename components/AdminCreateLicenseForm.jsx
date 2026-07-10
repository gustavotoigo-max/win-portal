"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminCreateLicenseForm({ dictionary }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [maxMachines, setMaxMachines] = useState(1);
  const [message, setMessage] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function createLicense(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setGeneratedKey("");

    try {
      const response = await fetch("/api/admin/licenses/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, maxMachines: Number(maxMachines) || 1 })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setMessage(payload.message || dictionary.admin.createError);
        return;
      }

      setMessage(dictionary.admin.createSuccess);
      setGeneratedKey(payload.licenseKey);
      setEmail("");
      setMaxMachines(1);
      router.refresh();
    } catch {
      setMessage(dictionary.admin.createError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="admin-create-form" onSubmit={createLicense}>
      <div>
        <label htmlFor="license-email">{dictionary.admin.customerEmail}</label>
        <input
          id="license-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="cliente@email.com"
          required
        />
      </div>
      <div>
        <label htmlFor="license-machines">{dictionary.admin.maxMachines}</label>
        <input
          id="license-machines"
          type="number"
          min="1"
          max="10"
          value={maxMachines}
          onChange={(event) => setMaxMachines(event.target.value)}
          required
        />
      </div>
      <button className="btn primary" type="submit" disabled={isLoading}>
        {isLoading ? dictionary.admin.creating : dictionary.admin.createLicense}
      </button>
      {message && <p className="note compact-note">{message}</p>}
      {generatedKey && (
        <div className="generated-key-box">
          <span>{dictionary.admin.generatedKey}</span>
          <code>{generatedKey}</code>
        </div>
      )}
    </form>
  );
}
