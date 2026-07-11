"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { products } from "@/lib/products";

export default function AdminCreateLicenseForm({ dictionary }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [maxMachines, setMaxMachines] = useState(1);
  const [productId, setProductId] = useState(products[0].id);
  const [validityAmount, setValidityAmount] = useState("");
  const [validityUnit, setValidityUnit] = useState("months");
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
        body: JSON.stringify({
          email,
          maxMachines: Number(maxMachines) || 1,
          productId,
          validityAmount: validityAmount ? Number(validityAmount) : null,
          validityUnit
        })
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
      setValidityAmount("");
      router.refresh();
    } catch {
      setMessage(dictionary.admin.createError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="admin-create-form official-license-form" onSubmit={createLicense}>
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
        <label htmlFor="license-product">{dictionary.admin.product}</label>
        <select
          id="license-product"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          required
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
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
      <div>
        <label htmlFor="license-validity-amount">{dictionary.admin.validity}</label>
        <input
          id="license-validity-amount"
          type="number"
          min="1"
          value={validityAmount}
          onChange={(event) => setValidityAmount(event.target.value)}
          placeholder={dictionary.admin.noExpiration}
          title={dictionary.admin.validityHint}
        />
      </div>
      <div>
        <label htmlFor="license-validity-unit">{dictionary.admin.validityUnit}</label>
        <select
          id="license-validity-unit"
          value={validityUnit}
          onChange={(event) => setValidityUnit(event.target.value)}
          title={dictionary.admin.validityHint}
        >
          <option value="days">{dictionary.admin.days}</option>
          <option value="months">{dictionary.admin.months}</option>
          <option value="years">{dictionary.admin.years}</option>
        </select>
      </div>
      <button className="btn primary generate-license-btn" type="submit" disabled={isLoading}>
        {isLoading ? dictionary.admin.creating : dictionary.admin.generateLicenseShort}
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
