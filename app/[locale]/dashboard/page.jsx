import Link from "next/link";
import { redirect } from "next/navigation";
import LicenseCard from "@/components/account/LicenseCard";
import Icon from "@/components/site/Icon";
import PageShell from "@/components/site/PageShell";
import ThemeSwitcher from "@/components/site/ThemeSwitcher";
import { getCustomerLicenses, getCustomerOrders } from "@/lib/account";
import { isDatabaseConfigured } from "@/lib/neon/database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha conta",
  robots: { index: false }
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/pt/login?next=${encodeURIComponent("/pt/dashboard")}`);
  }

  const configured = isDatabaseConfigured();
  const [licenses, orders] = configured
    ? await Promise.all([getCustomerLicenses(user), getCustomerOrders(user)])
    : [[], []];
  const activeCount = licenses.filter((license) => license.status === "active").length;
  const machineCount = licenses.reduce((sum, license) => sum + license.activeMachines, 0);
  const firstName = user.name && user.name !== user.email ? user.name.split(" ")[0] : null;

  return (
    <PageShell className="account-page">
      <div className="container">
        <header className="account-head">
          <div>
            <span className="eyebrow">Minha conta</span>
            <h1 className="page-title">{firstName ? `Olá, ${firstName}` : "Suas licenças"}</h1>
            <p className="muted">Conectado como {user.email}</p>
          </div>
          <Link className="btn btn-primary" href="/pt/solucoes"><Icon name="cart" size={18} /> Comprar outra ferramenta</Link>
        </header>

        <div className="stat-row">
          <div className="stat"><Icon name="key" /><div><strong>{activeCount}</strong><span>licenças ativas</span></div></div>
          <div className="stat"><Icon name="monitor" /><div><strong>{machineCount}</strong><span>computadores vinculados</span></div></div>
          <div className="stat"><Icon name="receipt" /><div><strong>{orders.length}</strong><span>pedidos</span></div></div>
        </div>

        {!configured && (
          <p className="form-message error">Banco de dados não configurado neste ambiente. Defina DATABASE_URL para ver as licenças.</p>
        )}

        <section className="account-section" id="licencas">
          <h2>Licenças</h2>
          {licenses.length ? (
            <div className="license-list">
              {licenses.map((license) => (
                <LicenseCard key={license.id} license={license} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="key" size={28} />
              <h3>Você ainda não tem licenças</h3>
              <p>Escolha uma ferramenta na loja. Assim que o pedido for concluído, a chave aparece aqui.</p>
              <Link className="btn btn-primary" href="/pt/solucoes">Ver produtos</Link>
            </div>
          )}
        </section>

        <section className="account-section" id="pedidos">
          <h2>Pedidos</h2>
          {orders.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Produto</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Desconto</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="mono" data-label="Pedido">{order.number}</td>
                      <td data-label="Produto">{order.product}</td>
                      <td data-label="Data">{order.date}</td>
                      <td data-label="Valor">{order.subtotal}</td>
                      <td data-label="Desconto">{order.discount ? `${order.discount}${order.coupon ? ` (${order.coupon})` : ""}` : "-"}</td>
                      <td data-label="Total"><strong>{order.total}</strong></td>
                      <td data-label="Status"><span className="status status-active">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nenhum pedido ainda.</p>
          )}
        </section>

        <section className="account-section" id="aparencia">
          <h2>Aparência</h2>
          <div className="preference-card">
            <div>
              <strong>Tema do site</strong>
              <p className="muted small">No modo Automático, o site acompanha o tema claro ou escuro do Windows e do navegador. A escolha fica salva neste navegador.</p>
            </div>
            <ThemeSwitcher variant="full" />
          </div>
        </section>

        <section className="help-strip">
          <Icon name="support" />
          <div>
            <strong>Como ativar</strong>
            <span>No aplicativo, informe o e-mail <strong>{user.email}</strong> e a chave da licença. Trocou de computador? Desvincule o antigo acima e ative no novo.</span>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
