import Header from "@/components/Header";
import { demoLicenses, statusClass } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n";
import { decryptLicenseKey } from "@/lib/license-crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getAdminLicenses() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return demoLicenses;
  }

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

  const { data, error } = await supabase
    .from("licenses")
    .select("id, license_key, license_key_ciphertext, license_key_hint, status, orders(order_number), profiles(email), machines(machine_name)")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  return data.map((license) => ({
    id: license.id,
    key: decryptLicenseKey(license.license_key_ciphertext) || license.license_key || `****-${license.license_key_hint || "----"}`,
    status: license.status,
    machine: license.machines?.[0]?.machine_name || "-",
    order: license.orders?.order_number || "-",
    user: license.profiles?.email || "-"
  }));
}

export default async function AdminPage() {
  const locale = "pt";
  const t = getDictionary(locale);
  const licenses = await getAdminLicenses();

  return (
    <>
      <Header locale={locale} active="admin" />
      <main className="dashboard-page container">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">{t.nav.admin}</p>
            <h1>{t.admin.title}</h1>
            <p className="muted">{t.admin.subtitle}</p>
          </div>
        </section>

        <section className="table-card">
          <div className="toolbar-row">
            <input aria-label={t.admin.search} placeholder={t.admin.search} />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.admin.user}</th>
                  <th>{t.admin.license}</th>
                  <th>{t.admin.status}</th>
                  <th>{t.admin.machine}</th>
                  <th>{t.admin.order}</th>
                  <th>{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.length ? (
                  licenses.map((license) => (
                    <tr key={license.id}>
                      <td>{license.user}</td>
                      <td>{license.key}</td>
                      <td><span className={statusClass(license.status)}>{license.status}</span></td>
                      <td>{license.machine || license.lastMachine}</td>
                      <td>{license.order}</td>
                      <td>
                        <form className="admin-actions" action="/api/admin/licenses" method="post">
                          <input type="hidden" name="licenseId" value={license.id} />
                          <button className="btn secondary" name="action" value="active" type="submit">{t.admin.activate}</button>
                          <button className="btn secondary" name="action" value="revoked" type="submit">{t.admin.revoke}</button>
                          <button className="btn danger" name="action" value="blocked" type="submit">{t.admin.block}</button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">{t.admin.empty}</td>
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
