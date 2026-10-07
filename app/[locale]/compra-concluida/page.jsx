import Link from "next/link";
import { redirect } from "next/navigation";
import { LicenseKey } from "@/components/account/LicenseKey";
import Icon from "@/components/site/Icon";
import PageShell from "@/components/site/PageShell";
import { getCustomerLicenses } from "@/lib/account";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compra concluída",
  robots: { index: false }
};

export default async function PurchaseDonePage({ searchParams }) {
  const { pedido } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/pt/login?next=${encodeURIComponent("/pt/dashboard")}`);
  }

  const [license] = pedido ? await getCustomerLicenses(user, { orderNumber: String(pedido) }) : [];
  if (!license) {
    redirect("/pt/dashboard");
  }

  const { product } = license;

  return (
    <PageShell className="success-page">
      <div className="container narrow">
        <div className="success-card">
          <span className="success-icon"><Icon name="check" size={30} strokeWidth={2.4} /></span>
          <h1>Compra concluída!</h1>
          <p className="muted">
            Pedido <span className="mono">{license.orderNumber}</span>. Sua licença do <strong>{product.title}</strong> já está
            ativa e fica sempre disponível em Minha conta.
          </p>

          <div className="success-key">
            <span className="field-label">Sua chave de ativação</span>
            <LicenseKey licenseKey={license.key} large />
          </div>

          <ol className="success-steps">
            <li>
              <span className="step-number">1</span>
              <div>
                <strong>Baixe o instalador</strong>
                <a className="btn btn-primary btn-sm" href={product.downloadUrl}>
                  <Icon name="download" size={16} /> {product.installerName}
                </a>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div>
                <strong>Abra o aplicativo e vá até a ativação</strong>
                <span>Informe o e-mail <strong>{user.email}</strong> e a chave acima.</span>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div>
                <strong>Pronto</strong>
                <span>O computador aparece vinculado em Minha conta.</span>
              </div>
            </li>
          </ol>

          <div className="hero-actions center">
            <Link className="btn btn-ghost" href="/pt/dashboard">Ir para Minha conta</Link>
            <Link className="btn btn-ghost" href="/pt/solucoes">Continuar comprando</Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
