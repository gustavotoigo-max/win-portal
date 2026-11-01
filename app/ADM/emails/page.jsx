import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import { getAdminContext } from "@/lib/admin-auth";
import { isEmailConfigured, siteUrl } from "@/lib/email/send-email";
import { passwordChangedEmail, purchaseEmail, welcomeEmail } from "@/lib/email/templates";
import { getProductPage } from "@/lib/product-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "E-mails", robots: { index: false } };

// Prévia dos e-mails enviados pelo site, com dados de exemplo.
export default async function AdminEmailsPage() {
  const admin = await getAdminContext();
  if (!admin.isAuthenticated) redirect(`/pt/login?next=${encodeURIComponent("/ADM/emails")}`);
  if (!admin.isAdmin) redirect("/ADM");

  const base = siteUrl();
  const product = getProductPage("fbrecovery");
  const samples = [
    ["Conta criada", "Enviado no primeiro acesso (e-mail e senha ou Google).", welcomeEmail({ base, name: "Maria Souza", email: "maria@exemplo.com" })],
    ["Licença ativada", "Enviado ao concluir a compra com cupom ou ao criar a licença no ADM.", purchaseEmail({
      base, email: "maria@exemplo.com", orderNumber: "FBRECOVERY-20261101120000-1234", product, expiresAt: "2026-12-31T23:59:59-03:00",
      maxMachines: 1, downloadUrl: `${base}/api/download/fbrecovery`, productUrl: `${base}/pt/fbrecovery`, couponCode: "TESTE-AB12"
    })],
    ["Senha alterada", "Aviso de segurança depois da troca de senha.", passwordChangedEmail({ base, email: "maria@exemplo.com" })]
  ];

  return (
    <PageShell className="account-page admin-page">
      <div className="container">
        <header className="account-head">
          <div>
            <span className="eyebrow">Administração</span>
            <h1 className="page-title">E-mails</h1>
            <p className="muted">
              {isEmailConfigured() ? "Envio configurado." : "Envio ainda não configurado: defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e EMAIL_FROM na Vercel."}
              {" "}Verificação de e-mail e troca de senha são enviadas pelo Neon Auth.
            </p>
          </div>
          <div className="hero-actions"><Link className="btn btn-ghost" href="/ADM">Licenças</Link></div>
        </header>
        {samples.map(([title, when, mail]) => (
          <section className="panel" key={title}>
            <h2>{title}</h2>
            <p className="muted">{when} Assunto: <strong>{mail.subject}</strong></p>
            <iframe title={title} srcDoc={mail.html} style={{ width: "100%", height: 640, border: "1px solid var(--line, #e2e8f0)", borderRadius: 10, background: "#fff" }} />
          </section>
        ))}
      </div>
    </PageShell>
  );
}
