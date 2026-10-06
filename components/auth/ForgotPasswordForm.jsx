"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordForm({ initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setIsLoading(true);
    setMessage(null);

    const redirectTo = `${window.location.origin}/pt/trocar-senha`;
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo
      });

      setMessage(
        error
          ? { type: "error", text: "Não foi possível enviar o e-mail agora. Tente novamente." }
          : { type: "success", text: "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha." }
      );
    } catch {
      setMessage({ type: "error", text: "Não foi possível enviar o e-mail agora. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>Recuperar senha</h1>
      <p className="muted">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>

      <label className="field">
        <span>E-mail</span>
        <input
          name="email"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={isLoading}>
        {isLoading ? "Enviando..." : "Enviar link"}
      </button>

      <p className="auth-switch">
        <Link href="/pt/login">Voltar para o login</Link>
      </p>
    </form>
  );
}
