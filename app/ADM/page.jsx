import AdminCreateLicenseForm from "@/components/AdminCreateLicenseForm";
import AdminLicensePanel from "@/components/AdminLicensePanel";
import Header from "@/components/Header";
import { getAdminContext } from "@/lib/admin-auth";
import { demoLicenses } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { products } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      licenses: demoLicenses,
      adminContext: { isAdmin: true, userEmail: "demo", role: "admin" }
    };
  }

  const adminContext = await getAdminContext();
  if (!adminContext.isAuthenticated) {
    redirect("/pt/login");
  }

  if (!adminContext.isAdmin) {
    return { licenses: [], adminContext };
  }

  const admin = createAdminClient();
  await admin
    .from("licenses")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  const { data, error } = await admin
    .from("licenses")
    .select("id, user_id, customer_email, order_id, product_id, license_key, license_key_ciphertext, license_key_hint, status, max_machines, expires_at, created_at, orders(order_number, customer_email, created_at, product_id), profiles(email)")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return { licenses: [], adminContext };

  const licenseIds = data.map((license) => license.id);
  const activationsByLicenseId = new Map();
  const logsByLicenseId = new Map();

  const { data: activations } = await admin
    .from("activations")
    .select("license_id, machine_id, machine_name, software_version, status, activated_at, last_seen_at, last_validated_at")
    .in("license_id", licenseIds)
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  activations?.forEach((activation) => {
    if (!activationsByLicenseId.has(activation.license_id)) {
      activationsByLicenseId.set(activation.license_id, activation);
    }
  });

  const { data: logs } = await admin
    .from("validation_logs")
    .select("license_id, ip_address, result, code, created_at")
    .in("license_id", licenseIds)
    .order("created_at", { ascending: false });

  logs?.forEach((log) => {
    if (!logsByLicenseId.has(log.license_id)) {
      logsByLicenseId.set(log.license_id, log);
    }
  });

  const licenses = data.map((license) => {
    const activation = activationsByLicenseId.get(license.id);
    const log = logsByLicenseId.get(license.id);

    return {
      id: license.id,
      key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
      status: license.status,
      product: productNames.get(license.product_id || license.orders?.product_id) || "-",
      maxMachines: license.max_machines,
      machineName: activation?.machine_name || "-",
      machineId: activation?.machine_id || "-",
      activationStatus: activation?.status || "-",
      softwareVersion: activation?.software_version || "-",
      activatedAt: formatDateTime(activation?.activated_at),
      lastSeen: formatDateTime(activation?.last_seen_at),
      lastValidation: formatDateTime(log?.created_at || activation?.last_validated_at),
      lastIp: log?.ip_address || "-",
      order: license.orders?.order_number || "-",
      user: license.customer_email || license.orders?.customer_email || license.profiles?.email || "-",
      expiresAt: license.expires_at ? formatDateTime(license.expires_at) : "Sem vencimento",
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
  const locale = "pt";
  const t = getDictionary(locale);
  const { licenses, adminContext } = await getAdminLicenses();

  return (
    <>
      <Header locale={locale} active="admin" />
      <main className="dashboard-page container admin-page">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">{t.nav.admin}</p>
            <h1>{t.admin.title}</h1>
            <p className="muted">{t.admin.subtitle}</p>
          </div>
        </section>

        {!adminContext.isAdmin ? (
          <section className="table-card admin-create-card">
            <p className="eyebrow">{t.nav.admin}</p>
            <h2>{t.admin.accessDeniedTitle}</h2>
            <p className="muted">{t.admin.accessDeniedText}</p>
            <div className="admin-access-box">
              <span>{t.admin.currentEmail}</span>
              <code>{adminContext.userEmail || "-"}</code>
              <span>{t.admin.currentRole}</span>
              <code>{adminContext.role}</code>
            </div>
            <p className="note">{t.admin.accessDeniedSql}</p>
            <Link className="btn secondary" href="/pt/dashboard">{t.nav.dashboard}</Link>
          </section>
        ) : (
          <>

        <section className="table-card admin-create-card">
          <div className="toolbar-row">
            <div>
              <p className="eyebrow">{t.admin.createLicense}</p>
              <h2>{t.admin.manualTitle}</h2>
              <p className="muted">{t.admin.manualText}</p>
            </div>
          </div>
          <AdminCreateLicenseForm dictionary={t} />
        </section>

        <section className="table-card admin-table-card">
          <div className="toolbar-row">
            <div>
              <p className="eyebrow">{t.admin.license}</p>
              <h2>{t.admin.licensesTitle}</h2>
            </div>
          </div>
          <AdminLicensePanel licenses={licenses} dictionary={t} />
          <p className="note">{t.admin.note}</p>
        </section>
          </>
        )}
      </main>
    </>
  );
}
