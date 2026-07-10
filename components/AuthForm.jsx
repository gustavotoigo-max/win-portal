"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function AuthForm({ locale, dictionary, mode }) {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage(dictionary.auth.demoNotice);
      return;
    }

    const supabase = createClient();
    const result = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${locale}/dashboard`,
            data: {
              full_name: form.get("name"),
              company: form.get("company"),
              preferred_locale: locale
            }
          }
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      const errorText = result.error.message.toLowerCase();
      if (errorText.includes("email not confirmed")) {
        setMessage(dictionary.auth.emailNotConfirmed);
      } else {
        setMessage(result.error.message);
      }
      return;
    }

    if (isSignup && !result.data.session) {
      setMessage(dictionary.auth.confirmEmailNotice);
      return;
    }

    window.location.href = `/${locale}/dashboard`;
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>{isSignup ? dictionary.auth.signupTitle : dictionary.auth.loginTitle}</h1>
      <p>{isSignup ? dictionary.auth.signupText : dictionary.auth.loginText}</p>

      {isSignup && (
        <>
          <label>
            {dictionary.auth.name}
            <input name="name" type="text" placeholder={dictionary.auth.name} required />
          </label>
          <label>
            {dictionary.auth.company}
            <input name="company" type="text" placeholder={dictionary.auth.company} />
          </label>
        </>
      )}

      <label>
        {dictionary.auth.email}
        <input name="email" type="email" placeholder="seu@email.com" required />
      </label>
      <label>
        {dictionary.auth.password}
        {!isSignup && (
          <span>
            <Link href={`/${locale}/login`}>{dictionary.auth.forgot}</Link>
          </span>
        )}
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="********"
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
            {showPassword ? "◐" : "◉"}
          </button>
        </div>
      </label>

      <button className="btn primary full" type="submit">
        {isSignup ? dictionary.auth.submitSignup : dictionary.auth.submitLogin}
      </button>

      <div className="divider">OU CONTINUE COM</div>
      <div className="social-row">
        <button type="button">Google</button>
        <button type="button">SSO</button>
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
