import Link from "next/link";
import { redirect } from "next/navigation";
import NpapActionButton from "@/components/admin/NpapActionButton";
import NpapFilter from "@/components/admin/NpapFilter";
import PageShell from "@/components/site/PageShell";
import { getAdminContext } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/neon/database";
import {
  auditKindText,
  closeReasonText,
  formatDateTime,
  formatDuration,
  getLiveSessions,
  getLoginCount24h,
  getRecentEvents,
  getServerLicenses,
  getSessionHistory,
  sessionStateText
} from "@/lib/npap/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Servidor — sessões e computadores", robots: { index: false } };

const statusText = { active: "Ativa", revoked: "Revogada", blocked: "Bloqueada", expired: "Expirada" };

function search(...parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export default async function AdminServerPage() {
  const admin = await getAdminContext();
  if (!admin.isAuthenticated) redirect(`/pt/login?next=${encodeURIComponent("/ADM/servidor")}`);
  if (!admin.isAdmin || !isDatabaseConfigured()) redirect("/ADM");

  const [live, history, events, licenses, todayLogins] = await Promise.all([
    getLiveSessions(),
    getSessionHistory(200),
    getRecentEvents(100),
    getServerLicenses(),
    getLoginCount24h()
  ]);
  const active = live.filter((s) => s.state === "ACTIVE").length;
  const silent = live.length - active;
  const devices = licenses.reduce((n, l) => n + l.devices.length, 0);

  return (
    <PageShell className="account-page admin-page">
      <div className="container">
        <header className="account-head">
          <div>
            <span className="eyebrow">Administração · Servidor NPAPcore</span>
            <h1 className="page-title">Sessões e computadores</h1>
            <p className="muted">Quem está usando os programas agora, em qual computador, e o histórico de uso.</p>
          </div>
          <div className="hero-actions">
            <Link className="btn btn-ghost" href="/ADM/servidor">Atualizar</Link>
            <Link className="btn btn-ghost" href="/ADM">Licenças</Link>
          </div>
        </header>

        <div className="stat-row">
          <div className="stat"><div><strong>{active}</strong><span>sessões ativas</span></div></div>
          <div className="stat"><div><strong>{silent}</strong><span>sem comunicação (reservadas)</span></div></div>
          <div className="stat"><div><strong>{devices}</strong><span>computadores ocupando vaga</span></div></div>
          <div className="stat"><div><strong>{todayLogins}</strong><span>logins nas últimas 24 h</span></div></div>
        </div>

        {/* ---------------------------------------------------------------- agora */}
        <section className="account-section">
          <h2>Em uso agora</h2>
          {live.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Conta</th><th>Programa</th><th>Computador</th><th>Situação</th><th>Aberta há</th><th>Último sinal</th><th /></tr>
                </thead>
                <tbody>
                  {live.map((s) => (
                    <tr key={s.id}>
                      <td>{s.email || "-"}</td>
                      <td>{s.product_name}</td>
                      <td>{s.device_label || "-"}</td>
                      <td><span className={`status ${s.state === "ACTIVE" ? "status-active" : "status-expired"}`}>{sessionStateText[s.state] || s.state}</span></td>
                      <td>{formatDuration(s.age_seconds)}</td>
                      <td>há {formatDuration(s.silence_seconds)}</td>
                      <td className="npap-cell-action">
                        <NpapActionButton
                          body={{ action: "close_session", sessionId: s.id }}
                          label="Encerrar"
                          confirmText="Encerrar e exigir novo login?"
                          danger
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Ninguém usando os programas neste momento.</p>
          )}
          <p className="muted small">
            &quot;Sem comunicação&quot;: o programa parou de responder há mais de 45 s. A conta fica reservada para o mesmo
            computador por 30 min e depois é liberada sozinha. &quot;Encerrar&quot; derruba na hora e obriga a entrar de novo pelo navegador.
          </p>
        </section>

        {/* ---------------------------------------------------------------- computadores */}
        <section className="account-section">
          <div className="npap-section-head">
            <h2>Computadores por licença</h2>
            <NpapFilter target="licencas" placeholder="Filtrar por e-mail ou computador" />
          </div>
          {licenses.length ? (
            <div className="table-wrap">
              <table className="data-table" data-filter="licencas">
                <thead>
                  <tr><th>Conta</th><th>Programa</th><th>Licença</th><th>Vagas</th><th>Computador</th><th>Último uso</th><th /></tr>
                </thead>
                <tbody>
                  {licenses.flatMap((l) => {
                    const head = (
                      <>
                        <td>{l.email || "-"}</td>
                        <td>{l.product_name}</td>
                        <td><span className={`status status-${l.status}`}>{statusText[l.status] || l.status}</span></td>
                        <td>{l.devices.length} de {l.max_machines}</td>
                      </>
                    );
                    if (!l.devices.length) {
                      return [
                        <tr key={l.id} data-search={search(l.email, l.product_name)}>
                          {head}
                          <td colSpan={3} className="muted">Nenhum computador conectado ainda</td>
                        </tr>
                      ];
                    }
                    return l.devices.map((d, i) => (
                      <tr key={`${l.id}-${d.device_id}`} data-search={search(l.email, l.product_name, d.label)}>
                        {i === 0 ? head : <><td /><td /><td /><td /></>}
                        <td>
                          {d.label || "-"}
                          {d.in_use && <span className="npap-tag">em uso</span>}
                          {d.blocked && <span className="npap-tag npap-tag-danger">bloqueado</span>}
                        </td>
                        <td>{formatDateTime(d.last_seen_at)}</td>
                        <td className="npap-cell-action">
                          <NpapActionButton
                            body={{ action: "release_device", licenseId: l.id, deviceId: d.device_id }}
                            label="Liberar vaga"
                            confirmText="Liberar a vaga? O programa nesse computador pedirá login."
                          />
                          {d.blocked ? (
                            <NpapActionButton body={{ action: "unblock_device", deviceId: d.device_id }} label="Desbloquear" confirmText="Desbloquear este computador?" />
                          ) : (
                            <NpapActionButton
                              body={{ action: "block_device", deviceId: d.device_id }}
                              label="Bloquear"
                              confirmText="Bloquear este computador para a conta inteira?"
                              danger
                            />
                          )}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nenhuma licença de programa do servidor emitida ainda.</p>
          )}
          <p className="muted small">
            &quot;Liberar vaga&quot; tira o computador da licença (o cliente pode usar em outro). &quot;Bloquear&quot; impede aquele
            computador de entrar na conta, mesmo que ele faça login de novo.
          </p>
        </section>

        {/* ---------------------------------------------------------------- histórico */}
        <section className="account-section">
          <div className="npap-section-head">
            <h2>Histórico de sessões</h2>
            <NpapFilter target="historico" placeholder="Filtrar por e-mail, programa ou computador" />
          </div>
          {history.length ? (
            <div className="table-wrap">
              <table className="data-table" data-filter="historico">
                <thead>
                  <tr><th>Conta</th><th>Programa</th><th>Computador</th><th>Início</th><th>Fim</th><th>Duração</th><th>Como terminou</th></tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} data-search={search(s.email, s.product_name, s.device_label)}>
                      <td>{s.email || "-"}</td>
                      <td>{s.product_name}</td>
                      <td>{s.device_label || "-"}</td>
                      <td>{formatDateTime(s.opened_at)}</td>
                      <td>{s.closed_at ? formatDateTime(s.closed_at) : sessionStateText[s.state]}</td>
                      <td>{formatDuration(s.duration_seconds)}</td>
                      <td>{s.close_reason ? closeReasonText[s.close_reason] || s.close_reason : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Sem sessões registradas.</p>
          )}
          <p className="muted small">Últimas 200 sessões. Quando as análises passarem pelo servidor, os arquivos processados e o resultado aparecem aqui também.</p>
        </section>

        {/* ---------------------------------------------------------------- eventos */}
        <section className="account-section">
          <div className="npap-section-head">
            <h2>Eventos recentes</h2>
            <NpapFilter target="eventos" placeholder="Filtrar eventos" />
          </div>
          {events.length ? (
            <div className="table-wrap">
              <table className="data-table" data-filter="eventos">
                <thead>
                  <tr><th>Quando</th><th>Evento</th><th>Conta</th><th>Computador</th><th>IP</th><th>Detalhe</th></tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} data-search={search(e.email, e.kind, auditKindText[e.kind], e.device_label, e.ip, e.detail)}>
                      <td>{formatDateTime(e.at)}</td>
                      <td>{auditKindText[e.kind] || e.kind}</td>
                      <td>{e.email || "-"}</td>
                      <td>{e.device_label || "-"}</td>
                      <td className="mono">{e.ip || "-"}</td>
                      <td className="muted">{e.detail || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Sem eventos.</p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
