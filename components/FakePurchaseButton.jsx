"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const messagesByCode = {
  missing_config: "fakePurchaseMissingConfig",
  auth_required: "fakePurchaseAuthRequired",
  profile_error: "fakePurchaseProfileError",
  order_error: "fakePurchaseOrderError",
  license_error: "fakePurchaseLicenseError"
};

export default function FakePurchaseButton({ locale, dictionary }) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setMessage("");

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
        setMessage(dictionary.dashboard[key]);
        return;
      }

      window.location.href = `/${locale}/dashboard?fakePurchase=success`;
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
    </div>
  );
}
