import AdminCreateLicenseForm from "@/components/AdminCreateLicenseForm";
import Header from "@/components/Header";
import { LicenseKeyCell } from "@/components/LicenseTableControls";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/pt/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/pt/dashboard");
  }
}

async function getAdminLicenses() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return demoLicenses;
  }

  await requireAdminUser();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("licenses")
    .select("id, user_id, customer_email, order_id, license_key, license_key_ciphertext, license_key_hint, status, max_machines, expires_at, created_at, orders(order_number, customer_email, created_at), profiles(email)")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

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

  return data.map((license) => {
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
}

export default async function AdminPage() {
  const locale = "pt";
  const t = getDictionary(locale);
  const licenses = await getAdminLicenses();

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
          <div className="table-scroll">
            <table className="admin-license-table">
              <thead>
                <tr>
                  <th>{t.admin.user}</th>
                  <th>{t.admin.license}</th>
                  <th>{t.admin.status}</th>
                  <th>{t.admin.maxMachines}</th>
                  <th>{t.admin.machineName}</th>
                  <th>{t.admin.machineId}</th>
                  <th>{t.admin.softwareVersion}</th>
                  <th>{t.admin.activatedAt}</th>
                  <th>{t.admin.lastSeen}</th>
                  <th>{t.admin.lastValidation}</th>
                  <th>{t.admin.lastIp}</th>
                  <th>{t.admin.order}</th>
                  <th>{t.admin.createdAt}</th>
                  <th>{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.length ? (
                  licenses.map((license) => (
                    <tr key={license.id}>
                      <td>{license.user}</td>
                      <td><LicenseKeyCell licenseKey={license.key} dictionary={t} /></td>
                      <td><span className={statusClass(license.status)}>{license.status}</span></td>
                      <td>{license.maxMachines}</td>
                      <td>{license.machineName}</td>
                      <td><span className="mono-cell">{license.machineId}</span></td>
                      <td>{license.softwareVersion}</td>
                      <td>{license.activatedAt}</td>
                      <td>{license.lastSeen}</td>
                      <td>{license.lastValidation}</td>
                      <td>{license.lastIp}</td>
                      <td>{license.order}</td>
                      <td>{license.createdAt}</td>
                      <td>
                        <form className="admin-actions" action="/api/admin/licenses" method="post">
                          <input type="hidden" name="licenseId" value={license.id} />
                          <button className="btn secondary" name="action" value="active" type="submit">{t.admin.activate}</button>
                          <button className="btn secondary" name="action" value="clear_activation" type="submit">{t.admin.clearActivation}</button>
                          <button className="btn secondary" name="action" value="revoked" type="submit">{t.admin.revoke}</button>
                          <button className="btn danger" name="action" value="blocked" type="submit">{t.admin.block}</button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="14">{t.admin.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="note">{t.admin.note}</p>
        </section>
      </main>
    </>
  );
}
