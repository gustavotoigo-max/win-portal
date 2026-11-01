import "server-only";

import nodemailer from "nodemailer";

// Envio de e-mail. Ordem: SMTP (Gmail hoje, Hostinger depois: só trocar as variáveis) e, se não houver, Resend.
//   SMTP_HOST   ex.: smtp.gmail.com (Hostinger: smtp.hostinger.com)
//   SMTP_PORT   465 (SSL) ou 587 (STARTTLS)
//   SMTP_USER   o e-mail da conta
//   SMTP_PASS   no Gmail, uma "senha de app" (nunca a senha normal)
//   EMAIL_FROM  ex.: "Nexotool <contato@...>"  (no Gmail, o mesmo e-mail do SMTP_USER)
let transport;

function smtpTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transport;
}

export function isEmailConfigured() {
  return Boolean(smtpTransport() || (process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.LICENSE_EMAIL_FROM)));
}

export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.LICENSE_EMAIL_FROM || process.env.SMTP_USER;

  const smtp = smtpTransport();
  if (smtp) {
    try {
      const info = await smtp.sendMail({ from, to, subject, html, text });
      return { ok: true, id: info.messageId };
    } catch (error) {
      console.error("SMTP send failed:", error.message);
      return { ok: false, message: "Falha ao enviar e-mail." };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !from) {
    return { ok: false, skipped: true, message: "Envio de e-mail não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM)." };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: payload.message || "Falha ao enviar e-mail." };
  return { ok: true, id: payload.id };
}

/** Endereço público do site para links nos e-mails (prévia da Vercel ou produção). */
export function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://www.nexotool.com.br";
}
