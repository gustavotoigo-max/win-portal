import Header from "@/components/Header";
import { LicenseKeyCell } from "@/components/LicenseTableControls";
import { getAuthSession } from "@/lib/auth/server";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { isDatabaseConfigured, query } from "@/lib/neon/database";
import { getProductById } from "@/lib/products";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDateTime(value, locale) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatValidity(createdAt, expiresAt, locale, dictionary) {
  if (!expiresAt) return dictionary.dashboard.noExpiration;

  const created = createdAt ? new Date(createdAt) : new Date();
  const expires = new Date(expiresAt);

  if (expires < new Date()) return dictionary.dashboard.expired;

  const days = Math.max(1, Math.round((expires.getTime() - created.getTime()) / 86400000));
  if (days >= 365) {
    const years = Math.max(1, Math.round(days / 365));
    return locale === "pt" ? `${years} ${years === 1 ? "ano" : "anos"}` : `${years} ${years === 1 ? "year" : "years"}`;
  }

  if (days >= 30) {
    const months = Math.max(1, Math.round(days / 30));
    return locale === "pt" ? `${months} ${months === 1 ? "mes" : "meses"}` : `${months} ${months === 1 ? "month" : "months"}`;
  }

  return locale === "pt" ? `${days} ${days === 1 ? "dia" : "dias"}` : `${days} ${days === 1 ? "day" : "days"}`;
}

async function getLicenses(locale, dictionary) {
  if (!isDatabaseConfigured()) {
    return demoLicenses;
  }

  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const data = await query(
    `select l.id, l.customer_email, l.product_id, l.license_key,
            l.license_key_ciphertext, l.license_key_hint, l.status,
            l.expires_at, l.created_at,
            o.order_number, o.created_at as order_created_at,
            coalesce(a.machine_name, a.machine_id, m.machine_name, m.machine_fingerprint) as machine_name,
            coalesce(
              a.last_seen_at, a.last_validated_at, a.activated_at,
              m.last_seen_at, m.registered_at
            ) as machine_seen_at
     from public.licenses l
     left join public.orders o on o.id = l.order_id
     left join lateral (
       select machine_id, machine_name, last_seen_at, last_validated_at, activated_at
       from public.activations
       where license_id = l.id
       order by last_seen_at desc nulls last, activated_at desc
       limit 1
     ) a on true
     left join lateral (
       select machine_fingerprint, machine_name, last_seen_at, registered_at
       from public.machines
       where license_id = l.id
       order by last_seen_at desc nulls last, registered_at desc
       limit 1
     ) m on true
     where l.user_id = $1
        or lower(l.customer_email) = lower($2)
     order by l.created_at desc`,
    [user.id, user.email || ""]
  );

  return data.map((license) => {
    return {
      id: license.id,
      key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
      status: license.expires_at && new Date(license.expires_at) < new Date() ? "expired" : license.status,
      product: getProductById(license.product_id).name,
      lastMachine: license.machine_name || "-",
      lastSeen: formatDateTime(license.machine_seen_at, locale),
      order: license.order_number || "-",
      date: formatDateTime(license.order_created_at || license.created_at, locale),
      validity: formatValidity(license.created_at, license.expires_at, locale, dictionary)
    };
  });
}

export default async function DashboardPage({ params, searchParams }) {
  const { locale: rawLocale } = await params;
  await searchParams;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);
  const licenses = await getLicenses(locale, t);

  return (
    <>
      <Header locale={locale} active="dashboard" />
      <main className="dashboard-page container">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">{t.nav.dashboard}</p>
            <h1>{t.dashboard.title}</h1>
            <p className="muted">{t.dashboard.subtitle}</p>
          </div>
        </section>

        <section className="table-card section-block user-license-panel">
          <div className="toolbar-row">
            <div>
              <p className="eyebrow">{t.dashboard.license}</p>
              <h2>{t.dashboard.title}</h2>
            </div>
          </div>

          {licenses.length ? (
            <div className="user-license-list">
              {licenses.map((license) => (
                <article className="user-license-card" key={license.id}>
                  <div className="user-license-key">
                    <span className="field-label">{t.dashboard.license}</span>
                    <LicenseKeyCell licenseKey={license.key} dictionary={t} />
                  </div>
                  <div className="user-license-grid">
                    <div><span className="field-label">{t.admin.product}</span><strong>{license.product}</strong></div>
                    <div><span className="field-label">{t.dashboard.status}</span><span className={statusClass(license.status)}>{license.status}</span></div>
                    <div><span className="field-label">{t.dashboard.lastMachine}</span><strong>{license.lastMachine}</strong></div>
                    <div><span className="field-label">{t.dashboard.order}</span><strong>{license.order}</strong></div>
                    <div><span className="field-label">{t.dashboard.purchaseDate}</span><strong>{license.date}</strong></div>
                    <div><span className="field-label">{t.dashboard.validity}</span><strong>{license.validity}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="note">{t.dashboard.empty}</p>
          )}
          <p className="note">{t.dashboard.note}</p>
        </section>
      </main>
    </>
  );
}
