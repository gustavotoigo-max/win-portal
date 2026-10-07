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

export default function AuthForm({ mode, next = "" }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSignup = mode === "signup";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  function authRedirectUrl(method) {
    const params = new URLSearchParams({ locale: "pt", method });
    if (next) params.set("next", next);
    return `${window.location.origin}/api/auth/callback?${params.toString()}`;
  }

  function friendlyAuthError(error) {
    const code = error?.code?.toUpperCase() || "";
    const text = error?.message?.toLowerCase() || "";

    if (
      code === "EMAIL_NOT_VERIFIED" ||
      text.includes("email not confirmed") ||
      text.includes("email not verified")
    ) {
      return "E-mail ainda não confirmado. Abra o link de confirmação enviado para sua caixa de entrada.";
    }

    if (
      code === "INVALID_EMAIL_OR_PASSWORD" ||
      code === "INVALID_PASSWORD" ||
      text.includes("invalid login credentials") ||
      text.includes("invalid email or password")
    ) {
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    }

    if (
      code === "USER_ALREADY_EXISTS" ||
      code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
      text.includes("already") ||
      text.includes("registered")
    ) {
      return "Este e-mail já está cadastrado. Entre na sua conta ou recupere a senha.";
    }

    if (text.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
    if (text.includes("rate limit") || text.includes("too many")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes.";
    }

    return "Não foi possível concluir o acesso agora. Tente novamente.";
  }

  async function redirectAfterAuth() {
    try {
      const response = await fetch(`/api/auth/redirect-target${nextQuery}`, { cache: "no-store" });

      if (response.ok) {
        const payload = await response.json();
        if (payload.target) {
          window.location.href = payload.target;
          return;
        }
      }
    } catch {
      // Segue para o painel padrao.
    }

    window.location.href = next || "/pt/dashboard";
  }

  async function recordLoginMethod(method, provider = method, profile = {}) {
    try {
      await fetch("/api/auth/login-method", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, provider, ...profile })
      });
    } catch {
      // O login nao deve falhar se o enriquecimento do perfil falhar.
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
        setMessage("Conta criada! Confirme seu e-mail pelo link que enviamos e depois entre.");
        return;
      }

      await recordLoginMethod("password", "email", {
        fullName: String(form.get("name") || ""),
        company: String(form.get("company") || ""),
        preferredLocale: "pt"
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
      <h1>{isSignup ? "Criar sua conta" : "Entrar na sua conta"}</h1>
      <p className="muted">
        {isSignup
          ? "Cadastre-se para comprar e gerenciar suas licenças."
          : next
            ? "Entre para continuar sua compra."
            : "Acesse suas licenças, computadores e pedidos."}
      </p>

      <button
        className="btn btn-social btn-block"
        type="button"
        disabled={isLoading}
        onClick={() => handleOAuth("google")}
      >
        <GoogleIcon /> Continuar com Google
      </button>

      <div className="divider"><span>ou com e-mail</span></div>

      {isSignup && (
        <div className="field-row">
          <label className="field">
            <span>Nome completo</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label className="field">
            <span>Empresa <em>(opcional)</em></span>
            <input name="company" type="text" autoComplete="organization" />
          </label>
        </div>
      )}

      <label className="field">
        <span>E-mail</span>
        <input
          name="email"
          type="email"
          placeholder="voce@empresa.com.br"
          value={email}
          autoComplete={isSignup ? "email" : "username"}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="field">
        <span className="field-label-row">
          Senha
          {!isSignup && (
            <Link className="link-muted" href={`/pt/esqueci-senha${email ? `?email=${encodeURIComponent(email)}` : ""}`}>
              Esqueci minha senha
            </Link>
          )}
        </span>
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
          />
          <button
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            <EyeIcon hidden={showPassword} />
          </button>
        </div>
        {isSignup && <small className="hint">Mínimo de 8 caracteres.</small>}
      </label>

      {message && <p className="form-message" role="status">{message}</p>}

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={isLoading}>
        {isLoading ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="auth-switch">
        {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
        <Link href={`/pt/${isSignup ? "login" : "cadastro"}${nextQuery}`}>
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
