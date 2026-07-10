import AdminCreateLicenseForm from "@/components/AdminCreateLicenseForm";
import Header from "@/components/Header";
import { LicenseKeyCell } from "@/components/LicenseTableControls";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/pt/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, email")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const envAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = userData.user.email?.toLowerCase();

  return {
    isAdmin: profile?.role === "admin" || envAdmins.includes(userEmail),
    userEmail,
    role: profile?.role || "sem perfil"
  };
}

async function getAdminLicenses() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      licenses: demoLicenses,
      adminContext: { isAdmin: true, userEmail: "demo", role: "admin" }
    };
  }

  const adminContext = await getAdminContext();
  if (!adminContext.isAdmin) {
    return { licenses: [], adminContext };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("licenses")
    .select("id, user_id, customer_email, order_id, license_key, license_key_ciphertext, license_key_hint, status, max_machines, expires_at, created_at, orders(order_number, customer_email, created_at), profiles(email)")
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
      maxMachines: license.max_machines,
      machineName: activation?.machine_name || "-",
      machineId: activation?.machine_id || "-",
      activationStatus: activation?.status || "-",
      softwareVersion: activation?.software_version || "-",
      activatedAt: activation?.activated_at?.slice(0, 10) || "-",
      lastSeen: activation?.last_seen_at?.slice(0, 10) || "-",
      lastValidation: log?.created_at?.slice(0, 10) || activation?.last_validated_at?.slice(0, 10) || "-",
      lastIp: log?.ip_address || "-",
      order: license.orders?.order_number || "-",
      user: license.customer_email || license.orders?.customer_email || license.profiles?.email || "-",
      createdAt: license.created_at?.slice(0, 10) || "-"
    };
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
            <input aria-label={t.admin.search} placeholder={t.admin.search} />
          </div>
          <div className="admin-license-list">
            {licenses.length ? (
              licenses.map((license) => (
                <article className="admin-license-card" key={license.id}>
                  <div className="license-card-head">
                    <div>
                      <span className="field-label">{t.admin.user}</span>
                      <strong>{license.user}</strong>
                    </div>
                    <span className={statusClass(license.status)}>{license.status}</span>
                  </div>

                  <div className="license-card-key">
                    <span className="field-label">{t.admin.license}</span>
                    <LicenseKeyCell licenseKey={license.key} dictionary={t} />
                  </div>

                  <div className="license-detail-grid">
                    <div><span className="field-label">{t.admin.maxMachines}</span><strong>{license.maxMachines}</strong></div>
                    <div><span className="field-label">{t.admin.machineName}</span><strong>{license.machineName}</strong></div>
                    <div><span className="field-label">{t.admin.softwareVersion}</span><strong>{license.softwareVersion}</strong></div>
                    <div><span className="field-label">{t.admin.activatedAt}</span><strong>{license.activatedAt}</strong></div>
                    <div><span className="field-label">{t.admin.lastSeen}</span><strong>{license.lastSeen}</strong></div>
                    <div><span className="field-label">{t.admin.lastValidation}</span><strong>{license.lastValidation}</strong></div>
                    <div><span className="field-label">{t.admin.lastIp}</span><strong>{license.lastIp}</strong></div>
                    <div><span className="field-label">{t.admin.order}</span><strong>{license.order}</strong></div>
                    <div><span className="field-label">{t.admin.createdAt}</span><strong>{license.createdAt}</strong></div>
                  </div>

                  <div className="machine-id-block">
                    <span className="field-label">{t.admin.machineId}</span>
                    <code>{license.machineId}</code>
                  </div>

                  <form className="admin-actions license-card-actions" action="/api/admin/licenses" method="post">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <button className="btn secondary" name="action" value="active" type="submit">{t.admin.activate}</button>
                    <button className="btn secondary" name="action" value="clear_activation" type="submit">{t.admin.clearActivation}</button>
                    <button className="btn secondary" name="action" value="revoked" type="submit">{t.admin.revoke}</button>
                    <button className="btn danger" name="action" value="blocked" type="submit">{t.admin.block}</button>
                  </form>
                </article>
              ))
            ) : (
              <p className="note">{t.admin.empty}</p>
            )}
          </div>
          <p className="note">{t.admin.note}</p>
        </section>
          </>
        )}
      </main>
    </>
  );
}
