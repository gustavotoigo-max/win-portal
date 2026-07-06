"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const messagesByCode = {
  missing_config: "fakePurchaseMissingConfig",
  auth_required: "fakePurchaseAuthRequired",
  profile_error: "fakePurchaseProfileError",
  order_error: "fakePurchaseOrderError",
  license_error: "fakePurchaseLicenseError"
};

export default function FakePurchaseButton({ locale, dictionary }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setMessage("");
    setGeneratedKey("");

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        window.location.href = `/${locale}/login`;
        return;
      }

      const response = await fetch("/api/licenses/fake-purchase", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ locale })
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const key = messagesByCode[payload.code] || "fakePurchaseUnknownError";
        const detail = payload.message ? ` Detalhe: ${payload.message}` : "";
        setMessage(`${dictionary.dashboard[key]}${detail}`);
        return;
      }

      setMessage(dictionary.dashboard.fakePurchaseSuccess);
      setGeneratedKey(payload.licenseKey || "");
      router.refresh();
    } catch {
      setMessage(dictionary.dashboard.fakePurchaseUnknownError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button className="btn primary" type="button" onClick={handleClick} disabled={isLoading}>
        {isLoading ? dictionary.dashboard.generating : dictionary.dashboard.buy}
      </button>
      {message && <p className="note">{message}</p>}
      {generatedKey && (
        <div className="generated-key-box">
          <span>{dictionary.dashboard.generatedKeyLabel}</span>
          <code>{generatedKey}</code>
        </div>
      )}
    </div>
  );
}
