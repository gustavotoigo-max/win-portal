"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.27-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

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

export default function AuthForm({ locale, dictionary, mode }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSignup = mode === "signup";

  function authRedirectUrl(method) {
    return `${window.location.origin}/api/auth/callback?locale=${encodeURIComponent(locale)}&method=${encodeURIComponent(method)}`;
  }

  function friendlyAuthError(error) {
    const code = error?.code?.toUpperCase() || "";
    const text = error?.message?.toLowerCase() || "";

    if (
      code === "EMAIL_NOT_VERIFIED" ||
      text.includes("email not confirmed") ||
      text.includes("email not verified")
    ) {
      return dictionary.auth.emailNotConfirmed;
    }

    if (
      code === "INVALID_EMAIL_OR_PASSWORD" ||
      code === "INVALID_PASSWORD" ||
      text.includes("invalid login credentials") ||
      text.includes("invalid email or password")
    ) {
      return dictionary.auth.invalidCredentials;
    }

    if (
      code === "USER_ALREADY_EXISTS" ||
      code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
      text.includes("already") ||
      text.includes("registered")
    ) {
      return dictionary.auth.emailInUse;
    }

    if (text.includes("password")) return dictionary.auth.passwordError;
    if (text.includes("rate limit") || text.includes("too many")) return dictionary.auth.tooManyRequests;

    return dictionary.auth.genericError;
  }

  async function redirectAfterAuth() {
    try {
      const response = await fetch(`/api/auth/redirect-target?locale=${encodeURIComponent(locale)}`, {
        cache: "no-store"
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.target) {
          window.location.href = payload.target;
          return;
        }
      }
    } catch {
      // Fall through to the regular dashboard.
    }

    window.location.href = `/${locale}/dashboard`;
  }

  async function recordLoginMethod(method, provider = method, profile = {}) {
    try {
      await fetch("/api/auth/login-method", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, provider, ...profile })
      });
    } catch {
      // Login must not fail if profile enrichment is unavailable.
    }
  }

  async function handleOAuth(provider) {
    setMessage("");
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: authRedirectUrl(provider)
      });

      if (error) {
        setMessage(friendlyAuthError(error));
      }
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formEmail = String(form.get("email") || "").trim().toLowerCase();
    const password = form.get("password");

    setIsLoading(true);
    setMessage("");

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            email: formEmail,
            password,
            name: String(form.get("name") || formEmail),
            callbackURL: authRedirectUrl("password")
          })
        : await authClient.signIn.email({ email: formEmail, password });

      if (result.error) {
        setMessage(friendlyAuthError(result.error));
        return;
      }

      if (isSignup && !result.data?.token && !result.data?.session) {
        setMessage(dictionary.auth.confirmEmailNotice);
        return;
      }

      await recordLoginMethod("password", "email", {
        fullName: String(form.get("name") || ""),
        company: String(form.get("company") || ""),
        preferredLocale: locale
      });
      await redirectAfterAuth();
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>{isSignup ? dictionary.auth.signupTitle : dictionary.auth.loginTitle}</h1>
      <p>{isSignup ? dictionary.auth.signupText : dictionary.auth.loginText}</p>

      {isSignup && (
        <>
          <label>
            {dictionary.auth.name}
            <input name="name" type="text" placeholder={dictionary.auth.name} autoComplete="name" required />
          </label>
          <label>
            {dictionary.auth.companyOptional}
            <input name="company" type="text" placeholder={dictionary.auth.company} autoComplete="organization" />
          </label>
        </>
      )}

      <label>
        {dictionary.auth.email}
        <input
          name="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        {dictionary.auth.password}
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="********"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
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
      {!isSignup && (
        <Link className="forgot-password-link" href={`/${locale}/esqueci-senha${email ? `?email=${encodeURIComponent(email)}` : ""}`}>
          {dictionary.auth.forgot}
        </Link>
      )}

      <button className="btn primary full" type="submit" disabled={isLoading}>
        {isLoading ? dictionary.auth.processing : isSignup ? dictionary.auth.submitSignup : dictionary.auth.submitLogin}
      </button>

      <div className="divider">{dictionary.auth.continueWith}</div>
      <div className="social-row">
        <button
          aria-label={dictionary.auth.continueGoogle}
          className="google-auth-button"
          title={dictionary.auth.continueGoogle}
          type="button"
          disabled={isLoading}
          onClick={() => handleOAuth("google")}
        >
          <GoogleIcon />
        </button>
      </div>

      {message && <p className="note">{message}</p>}

      <p className="auth-switch">
        {isSignup ? dictionary.auth.hasAccount : dictionary.auth.noAccount}{" "}
        <Link href={`/${locale}/${isSignup ? "login" : "cadastro"}`}>
          {isSignup ? dictionary.auth.submitLogin : dictionary.auth.submitSignup}
        </Link>
      </p>
    </form>
  );
}
