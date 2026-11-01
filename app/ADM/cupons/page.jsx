import Link from "next/link";
import { redirect } from "next/navigation";
import AdminCouponActions from "@/components/admin/AdminCouponActions";
import AdminCouponForm from "@/components/admin/AdminCouponForm";
import PageShell from "@/components/site/PageShell";
import { getAdminContext } from "@/lib/admin-auth";
import { isDatabaseConfigured, query } from "@/lib/neon/database";
import { products } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cupons", robots: { index: false } };

const productNames = new Map(products.map((p) => [p.id, p.name]));

function fmt(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function situation(c) {
  if (!c.active) return ["Desativado", "status-revoked"];
  if (c.valid_until && new Date(c.valid_until) < new Date()) return ["Vencido", "status-expired"];
  if (c.max_uses && c.uses >= c.max_uses) return ["Esgotado", "status-expired"];
  return ["Válido", "status-active"];
}

async function load() {
  try {
    const coupons = await query(
      `select c.*, coalesce(json_agg(json_build_object('email', r.customer_email, 'at', r.created_at, 'order', r.order_number)
                order by r.created_at desc) filter (where r.id is not null), '[]') as redemptions
         from public.coupons c left join public.coupon_redemptions r on r.coupon_id = c.id
        group by c.id order by c.created_at desc`
    );
    return { coupons, missing: false };
  } catch (e) {
    if (String(e?.message || "").includes("does not exist")) return { coupons: [], missing: true };
    throw e;
  }
}

export default async function AdminCouponsPage() {
  const admin = await getAdminContext();
  if (!admin.isAuthenticated) redirect(`/pt/login?next=${encodeURIComponent("/ADM/cupons")}`);
  if (!admin.isAdmin || !isDatabaseConfigured()) redirect("/ADM");
  const { coupons, missing } = await load();

  return (
    <PageShell className="account-page admin-page">
      <div className="container">
        <header className="account-head">
          <div>
            <span className="eyebrow">Administração</span>
            <h1 className="page-title">Cupons</h1>
            <p className="muted">A pessoa cria a conta, aplica o cupom na compra e a licença é ativada na hora.</p>
          </div>
          <div className="hero-actions">
            <Link className="btn btn-ghost" href="/ADM">Licenças</Link>
          </div>
        </header>

        {missing ? (
          <section className="panel">
            <h2>Tabela de cupons ainda não existe</h2>
            <p className="muted">Rode <code>neon/migrations/20261103_cupons.sql</code> no SQL Editor do Neon (branch dev) e recarregue.</p>
          </section>
        ) : (
          <>
            <section className="panel">
              <h2>Novo cupom</h2>
              <AdminCouponForm />
            </section>

            <section className="account-section">
              <h2>Cupons cadastrados ({coupons.length})</h2>
              {coupons.length === 0 ? (
                <p className="muted">Nenhum cupom ainda.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Código</th><th>Desconto</th><th>Produto</th><th>Válido até</th><th>Usos</th>
                        <th>Licença</th><th>Situação</th><th>Quem usou</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c) => {
                        const [text, cls] = situation(c);
                        return (
                          <tr key={c.id}>
                            <td className="mono">{c.code}{c.note ? <small className="muted block">{c.note}</small> : null}</td>
                            <td>{c.percent_off}%</td>
                            <td>{c.product_id ? productNames.get(c.product_id) || c.product_id : "Todos"}</td>
                            <td>{c.valid_until ? fmt(c.valid_until) : "Sem prazo"}</td>
                            <td>{c.uses}{c.max_uses ? ` de ${c.max_uses}` : ""}</td>
                            <td>{c.license_days ? `${c.license_days} dias` : "Sem prazo"} · {c.max_machines} PC</td>
                            <td><span className={`status ${cls}`}>{text}</span></td>
                            <td>
                              {c.redemptions.length === 0 ? "-" : (
                                <details>
                                  <summary>{c.redemptions.length} conta(s)</summary>
                                  <ul className="plain-list">
                                    {c.redemptions.map((r) => <li key={r.email + r.at}>{r.email} <small className="muted">{fmt(r.at)}</small></li>)}
                                  </ul>
                                </details>
                              )}
                            </td>
                            <td><AdminCouponActions id={c.id} active={c.active} used={c.uses > 0} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
