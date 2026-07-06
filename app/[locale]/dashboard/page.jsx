import FakePurchaseButton from "@/components/FakePurchaseButton";
import Header from "@/components/Header";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function fakePurchaseMessage(t, code) {
  const messages = {
    success: t.dashboard.fakePurchaseSuccess,
    missing_config: t.dashboard.fakePurchaseMissingConfig,
    profile_error: t.dashboard.fakePurchaseProfileError,
    order_error: t.dashboard.fakePurchaseOrderError,
    license_error: t.dashboard.fakePurchaseLicenseError
  };
  return code ? messages[code] || t.dashboard.fakePurchaseUnknownError : null;
}

async function getLicenses(locale) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return demoLicenses;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(`/${locale}/login`);
  }

  const { data, error } = await supabase
    .from("licenses")
    .select("id, license_key, license_key_ciphertext, license_key_hint, status, expires_at, orders(order_number, created_at), machines(machine_name, last_seen_at)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  if (!data?.length) {
    return [];
  }

  return data.map((license) => {
    const machine = license.machines?.[0];
    return {
      id: license.id,
      key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
      status: license.status,
      lastMachine: machine?.machine_name || "-",
      lastSeen: machine?.last_seen_at?.slice(0, 10) || "-",
      order: license.orders?.order_number || "-",
      date: license.orders?.created_at?.slice(0, 10) || "-"
    };
  });
}

export default async function DashboardPage({ params, searchParams }) {
  const { locale: rawLocale } = await params;
  const { fakePurchase } = await searchParams;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);
  const licenses = await getLicenses(locale);
  const message = fakePurchaseMessage(t, fakePurchase);
  const active = licenses.filter((item) => item.status === "active").length;
  const blocked = licenses.filter((item) => item.status === "blocked").length;
  const revoked = licenses.filter((item) => item.status === "revoked").length;

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
          <FakePurchaseButton locale={locale} dictionary={t} />
        </section>

        {message && <p className="note">{message}</p>}

        <section className="dash-grid">
          <article className="dash-card"><span>{t.dashboard.total}</span><strong>{licenses.length}</strong></article>
          <article className="dash-card"><span>{t.dashboard.active}</span><strong>{active}</strong></article>
          <article className="dash-card"><span>{t.dashboard.blocked}</span><strong>{blocked}</strong></article>
          <article className="dash-card"><span>{t.dashboard.revoked}</span><strong>{revoked}</strong></article>
        </section>

        <section className="table-card section-block">
          <div className="toolbar-row">
            <div>
              <p className="eyebrow">{t.dashboard.license}</p>
              <h2>{t.dashboard.title}</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.dashboard.license}</th>
                  <th>{t.dashboard.status}</th>
                  <th>{t.dashboard.lastMachine}</th>
                  <th>{t.dashboard.lastSeen}</th>
                  <th>{t.dashboard.order}</th>
                  <th>{t.dashboard.date}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.length ? (
                  licenses.map((license) => (
                    <tr key={license.id}>
                      <td>{license.key}</td>
                      <td><span className={statusClass(license.status)}>{license.status}</span></td>
                      <td>{license.lastMachine}</td>
                      <td>{license.lastSeen}</td>
                      <td>{license.order}</td>
                      <td>{license.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">{t.dashboard.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="note">{t.dashboard.note}</p>
        </section>
      </main>
    </>
  );
}
