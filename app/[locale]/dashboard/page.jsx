import Header from "@/components/Header";
import { LicenseKeyCell } from "@/components/LicenseTableControls";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { getProductById } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return demoLicenses;
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(`/${locale}/login`);
  }

  const queryClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
  const userEmail = userData.user.email?.toLowerCase();
  const licenseSelect = "id, order_id, customer_email, product_id, license_key, license_key_ciphertext, license_key_hint, status, expires_at, created_at";
  const [byUserResult, byEmailResult] = await Promise.all([
    queryClient
      .from("licenses")
      .select(licenseSelect)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
    queryClient
      .from("licenses")
      .select(licenseSelect)
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false })
  ]);

  const error = byUserResult.error || byEmailResult.error;
  const data = [
    ...(byUserResult.data || []),
    ...(byEmailResult.data || [])
  ]
    .filter((license, index, all) => all.findIndex((item) => item.id === license.id) === index)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  if (error) {
    console.error("Dashboard licenses query failed:", error.message);
    return [];
  }

  if (!data?.length) {
    return [];
  }

  const orderIds = [...new Set(data.map((license) => license.order_id).filter(Boolean))];
  const licenseIds = data.map((license) => license.id);
  const ordersById = new Map();
  const machinesByLicenseId = new Map();

  if (orderIds.length) {
    const { data: orders, error: ordersError } = await queryClient
      .from("orders")
      .select("id, order_number, created_at")
      .in("id", orderIds);

    if (ordersError) {
      console.error("Dashboard orders query failed:", ordersError.message);
    } else {
      orders?.forEach((order) => ordersById.set(order.id, order));
    }
  }

  const { data: activations, error: activationsError } = await queryClient
    .from("activations")
    .select("license_id, machine_id, machine_name, last_seen_at, last_validated_at, activated_at")
    .in("license_id", licenseIds)
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (activationsError) {
    console.error("Dashboard activations query failed:", activationsError.message);
  } else {
    activations?.forEach((activation) => {
      if (!machinesByLicenseId.has(activation.license_id)) {
        machinesByLicenseId.set(activation.license_id, {
          name: activation.machine_name || activation.machine_id,
          seenAt: activation.last_seen_at || activation.last_validated_at || activation.activated_at
        });
      }
    });
  }

  const { data: machines, error: machinesError } = await queryClient
    .from("machines")
    .select("license_id, machine_fingerprint, machine_name, last_seen_at, registered_at")
    .in("license_id", licenseIds)
    .order("last_seen_at", { ascending: false });

  if (machinesError) {
    console.error("Dashboard machines query failed:", machinesError.message);
  } else {
    machines?.forEach((machine) => {
      if (!machinesByLicenseId.has(machine.license_id)) {
        machinesByLicenseId.set(machine.license_id, {
          name: machine.machine_name || machine.machine_fingerprint,
          seenAt: machine.last_seen_at || machine.registered_at
        });
      }
    });
  }

  return data.map((license) => {
    const order = ordersById.get(license.order_id);
    const machine = machinesByLicenseId.get(license.id);
    return {
      id: license.id,
      key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
      status: license.expires_at && new Date(license.expires_at) < new Date() ? "expired" : license.status,
      product: getProductById(license.product_id).name,
      lastMachine: machine?.name || "-",
      lastSeen: formatDateTime(machine?.seenAt, locale),
      order: order?.order_number || "-",
      date: formatDateTime(order?.created_at || license.created_at, locale),
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
