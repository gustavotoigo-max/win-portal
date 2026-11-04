import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/site/Icon";
import PageShell from "@/components/site/PageShell";
import { getCustomerLicenses } from "@/lib/account";
import { productPath } from "@/lib/products";
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
          <h1>Licença ativada!</h1>
          <p className="muted">
            Pedido <span className="mono">{license.orderNumber}</span>. Sua licença do <strong>{product.title}</strong> já está
            ativa e fica sempre disponível em Minha conta.
          </p>

          {license.validity && license.validity !== "Vitalícia" ? <p className="muted">Licença {license.validity.toLowerCase()}.</p> : null}

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
                <strong>Abra o programa e entre pelo navegador</strong>
                <span>Confirme o acesso no site com a conta <strong>{user.email}</strong>. Não há chave para digitar.</span>
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
            <Link className="btn btn-ghost" href={productPath(product.id)}>Página do {product.name}</Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
