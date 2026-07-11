"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordForm({ locale, dictionary, initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage(dictionary.auth.demoNotice);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?locale=${encodeURIComponent(locale)}&method=password&next=/${locale}/trocar-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo
    });

    setIsLoading(false);
    setMessage(error ? dictionary.auth.resetError : dictionary.auth.resetSent);
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>{dictionary.auth.forgotTitle}</h1>
      <p>{dictionary.auth.forgotText}</p>

      <label>
        {dictionary.auth.email}
        <input
          name="email"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="seu@email.com"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <button className="btn primary full" type="submit" disabled={isLoading}>
        {isLoading ? dictionary.auth.processing : dictionary.auth.sendReset}
      </button>

      {message && <p className="note">{message}</p>}

      <p className="auth-switch">
        <Link href={`/${locale}/login`}>{dictionary.auth.backToLogin}</Link>
      </p>
    </form>
  );
}
