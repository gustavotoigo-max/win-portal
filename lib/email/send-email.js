export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_EMAIL_FROM || process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      message: "Envio de e-mail nao configurado. Defina RESEND_API_KEY e LICENSE_EMAIL_FROM."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, html, text })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      message: payload.message || "Falha ao enviar e-mail."
    };
  }

  return { ok: true, id: payload.id };
}
