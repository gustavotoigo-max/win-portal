"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

function EyeIcon({ hidden }) {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      {hidden ? (
        <>
          <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="M9.9 5.1A9.7 9.7 0 0 1 12 5c5 0 9 4.5 10 7a13.5 13.5 0 0 1-3 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="M6.1 6.4A13.6 13.6 0 0 0 2 12c1 2.5 5 7 10 7 1.3 0 2.6-.3 3.7-.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export default function ResetPasswordForm({ locale, dictionary, token }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setMessage(dictionary.auth.resetError);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token
      });

      if (error) {
        setMessage(dictionary.auth.passwordError);
        return;
      }

      const response = await fetch(`/api/auth/redirect-target?locale=${encodeURIComponent(locale)}`, {
        cache: "no-store"
      });
      const payload = response.ok ? await response.json() : null;
      window.location.href = payload?.target || `/${locale}/dashboard`;
    } catch {
      setMessage(dictionary.auth.passwordError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>{dictionary.auth.resetTitle}</h1>
      <p>{dictionary.auth.resetText}</p>

      <label>
        {dictionary.auth.newPassword}
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="password-toggle"
            type="button"
            title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((value) => !value)}
          >
            <EyeIcon hidden={showPassword} />
          </button>
        </div>
      </label>

      <button className="btn primary full" type="submit" disabled={isLoading}>
        {isLoading ? dictionary.auth.processing : dictionary.auth.updatePassword}
      </button>

      {message && <p className="note">{message}</p>}
    </form>
  );
}
