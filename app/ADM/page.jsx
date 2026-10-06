import AdminCreateLicenseForm from "@/components/admin/AdminCreateLicenseForm";
import AdminLicensePanel from "@/components/admin/AdminLicensePanel";
import PageShell from "@/components/site/PageShell";
import { getAdminContext } from "@/lib/admin-auth";
import { adminTexts as t } from "@/lib/admin-texts";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { isDatabaseConfigured, query } from "@/lib/neon/database";
import { products } from "@/lib/products";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Administração", robots: { index: false } };

const productNames = new Map(products.map((product) => [product.id, product.name]));

function formatDateTime(value, locale = "pt-BR") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

async function getAdminLicenses() {
  const adminContext = await getAdminContext();
  if (!adminContext.isAuthenticated) {
    redirect(`/pt/login?next=${encodeURIComponent("/ADM")}`);
  }

  if (!adminContext.isAdmin || !isDatabaseConfigured()) {
    return { licenses: [], adminContext };
  }

  await query(
    `update public.licenses
     set status = 'expired'
     where status = 'active' and expires_at < now()`
  );

  const data = await query(
    `select l.id, l.user_id, l.customer_email, l.order_id, l.product_id,
            l.license_key, l.license_key_ciphertext, l.license_key_hint,
            l.status, l.max_machines, l.expires_at, l.created_at,
            o.order_number, o.customer_email as order_customer_email,
            o.product_id as order_product_id,
            p.email as profile_email,
            a.machine_id, a.machine_name, a.software_version,
            a.status as activation_status, a.activated_at, a.last_seen_at,
            a.last_validated_at,
            v.ip_address as last_ip, v.created_at as validation_created_at
     from public.licenses l
     left join public.orders o on o.id = l.order_id
     left join public.profiles p on p.user_id = l.user_id
     left join lateral (
       select machine_id, machine_name, software_version, status,
              activated_at, last_seen_at, last_validated_at
       from public.activations
       where license_id = l.id
       order by last_seen_at desc nulls last, activated_at desc
       limit 1
     ) a on true
     left join lateral (
       select ip_address, created_at
       from public.validation_logs
       where license_id = l.id
       order by created_at desc
       limit 1
     ) v on true
     order by l.created_at desc`
  );

  if (!data.length) return { licenses: [], adminContext };

  const licenses = data.map((license) => {
    return {
      id: license.id,
      key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
      status: license.status,
      product: productNames.get(license.product_id || license.order_product_id) || "-",
      maxMachines: license.max_machines,
      machineName: license.machine_name || "-",
      machineId: license.machine_id || "-",
      activationStatus: license.activation_status || "-",
      softwareVersion: license.software_version || "-",
      activatedAt: formatDateTime(license.activated_at),
      lastSeen: formatDateTime(license.last_seen_at),
      lastValidation: formatDateTime(license.validation_created_at || license.last_validated_at),
      lastIp: license.last_ip || "-",
      order: license.order_number || "-",
      user: license.customer_email || license.order_customer_email || license.profile_email || "-",
      expiresAt: license.expires_at ? formatDateTime(license.expires_at) : t.noExpiration,
      createdAt: formatDateTime(license.created_at)
    };
  });

  licenses.forEach((license) => {
    license.searchText = [
      license.user,
      license.key,
      license.status,
      license.product,
      license.machineName,
      license.machineId,
      license.softwareVersion,
      license.lastIp,
      license.order,
      license.createdAt,
      license.expiresAt
    ].join(" ").toLowerCase();
  });

  return { licenses, adminContext };
}

export default async function AdminPage() {
  const { licenses, adminContext } = await getAdminLicenses();
  const counts = licenses.reduce((acc, license) => {
    acc[license.status] = (acc[license.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell className="account-page admin-page">
      <div className="container">
        <header className="account-head">
          <div>
            <span className="eyebrow">Administração</span>
            <h1 className="page-title">{t.title}</h1>
            <p className="muted">{t.subtitle}</p>
          </div>
        </header>

        {!adminContext.isAdmin ? (
          <section className="panel">
            <h2>{t.accessDeniedTitle}</h2>
            <p className="muted">{t.accessDeniedText}</p>
            <dl className="license-facts">
              <div><dt>{t.currentEmail}</dt><dd className="mono">{adminContext.userEmail || "-"}</dd></div>
              <div><dt>{t.currentRole}</dt><dd className="mono">{adminContext.role}</dd></div>
            </dl>
            <p className="muted small">{t.accessDeniedSql}</p>
            <Link className="btn btn-ghost" href="/pt/dashboard">Ir para Minha conta</Link>
          </section>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat"><div><strong>{licenses.length}</strong><span>licenças emitidas</span></div></div>
              <div className="stat"><div><strong>{counts.active || 0}</strong><span>ativas</span></div></div>
              <div className="stat"><div><strong>{(counts.revoked || 0) + (counts.blocked || 0)}</strong><span>revogadas ou bloqueadas</span></div></div>
              <div className="stat"><div><strong>{counts.expired || 0}</strong><span>expiradas</span></div></div>
            </div>

            <section className="panel">
              <h2>{t.manualTitle}</h2>
              <p className="muted">{t.manualText}</p>
              <AdminCreateLicenseForm />
            </section>

            <section className="account-section">
              <h2>{t.licensesTitle}</h2>
              <AdminLicensePanel licenses={licenses} />
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
