import "server-only";

import { query, queryOne } from "@/lib/neon/database";

// Consultas e ações do servidor NPAPcore (schema npap) usadas pelo ADM e por Minha conta.
// Cada ação é UMA instrução SQL (CTEs), então acontece inteira ou não acontece.
// Regra: tirar o acesso de um computador sempre fecha a sessão dele E revoga os tokens,
// senão o programa simplesmente reabriria a sessão no próximo sinal de vida.

const TIMEZONE = "America/Sao_Paulo";

export function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TIMEZONE }).format(new Date(value));
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const s = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m) return `${m} min`;
  return `${s} s`;
}

export const closeReasonText = {
  client: "Fechou o programa",
  logout: "Saiu da conta",
  expired: "Sem sinal (expirou)",
  revoked: "Acesso revogado",
  admin: "Encerrada pelo ADM",
  cleanup_failed: "Falha na limpeza"
};

export const sessionStateText = {
  ACTIVE: "Ativa",
  DISCONNECTED: "Sem comunicação",
  CLEANING: "Encerrando",
  CLEANUP_FAILED: "Falha na limpeza",
  CLOSED: "Encerrada"
};

export const auditKindText = {
  "login.success": "Entrou pelo navegador",
  "login.no_license": "Login recusado: sem licença",
  "login.device_limit": "Login recusado: limite de computadores",
  "login.device_revoked": "Login recusado: computador bloqueado",
  "token.reuse_detected": "Token reaproveitado (possível roubo)",
  "token.device_mismatch": "Token usado em outro computador",
  "token.license_invalid": "Renovação recusada: licença inválida",
  "session.opened": "Abriu o programa",
  "session.resumed": "Retomou a sessão",
  "session.conflict": "Tentou abrir com a conta em uso",
  "session.closed": "Fechou o programa",
  "session.license_invalid": "Bloqueado: licença inválida",
  logout: "Saiu da conta",
  "admin.session_closed": "ADM encerrou a sessão",
  "admin.device_released": "ADM liberou a vaga do computador",
  "admin.device_blocked": "ADM bloqueou o computador",
  "admin.device_unblocked": "ADM desbloqueou o computador",
  "customer.device_released": "Cliente liberou o computador"
};

// ------------------------------------------------------------------ leitura

export async function getLiveSessions() {
  return query(
    `select s.id, s.state, s.product_id, s.opened_at, s.last_heartbeat_at, s.disconnected_at,
            extract(epoch from now() - s.opened_at) as age_seconds,
            extract(epoch from now() - s.last_heartbeat_at) as silence_seconds,
            p.name as product_name, d.label as device_label, pr.email
       from npap.session s
       join npap.product p on p.id = s.product_id
       join npap.device d on d.id = s.device_id
       left join public.profiles pr on pr.user_id = s.user_id
      where s.state <> 'CLOSED'
      order by s.opened_at desc`
  );
}

export async function getSessionHistory(limit = 200) {
  return query(
    `select s.id, s.state, s.opened_at, s.closed_at, s.close_reason,
            extract(epoch from coalesce(s.closed_at, now()) - s.opened_at) as duration_seconds,
            p.name as product_name, d.label as device_label, pr.email
       from npap.session s
       join npap.product p on p.id = s.product_id
       join npap.device d on d.id = s.device_id
       left join public.profiles pr on pr.user_id = s.user_id
      order by s.opened_at desc
      limit $1`,
    [limit]
  );
}

export async function getRecentEvents(limit = 100) {
  return query(
    `select e.id, e.at, e.kind, e.product_id, e.detail, host(e.ip) as ip, d.label as device_label, pr.email
       from npap.audit_event e
       left join npap.device d on d.id = e.device_id
       left join public.profiles pr on pr.user_id = e.user_id
      order by e.id desc
      limit $1`,
    [limit]
  );
}

export async function getLoginCount24h() {
  const row = await queryOne(
    "select count(*)::int as n from npap.audit_event where kind = 'login.success' and at > now() - interval '24 hours'"
  );
  return row?.n || 0;
}

/** Licenças de produtos do servidor, com os computadores que ocupam vaga (ADM). */
export async function getServerLicenses() {
  const licenses = await query(
    `select l.id, l.product_id, l.status, l.max_machines, l.expires_at,
            coalesce(pr.email, l.customer_email) as email, p.name as product_name
       from public.licenses l
       join npap.product p on p.id = l.product_id
       left join public.profiles pr on pr.user_id = l.user_id
      order by l.created_at desc`
  );
  if (!licenses.length) return [];
  const devices = await getDevicesForLicenses(licenses.map((l) => l.id));
  return licenses.map((l) => ({ ...l, devices: devices.filter((d) => d.license_id === l.id) }));
}

/** Computadores ocupando vaga nas licenças informadas. */
export async function getDevicesForLicenses(licenseIds) {
  if (!licenseIds.length) return [];
  return query(
    `select ld.license_id, d.id as device_id, d.label, d.first_seen_at, d.last_seen_at,
            d.revoked_at is not null as blocked, ld.registered_at,
            exists (select 1 from npap.session s where s.device_id = d.id and s.state <> 'CLOSED') as in_use
       from npap.license_device ld
       join npap.device d on d.id = ld.device_id
      where ld.license_id = any($1::uuid[]) and ld.released_at is null
      order by d.last_seen_at desc`,
    [licenseIds]
  );
}

// ------------------------------------------------------------------ ações

/** Encerra a sessão e obriga aquele computador a entrar de novo pelo navegador. */
export async function closeSession(sessionId, actor) {
  const row = await queryOne(
    `with s as (
       update npap.session set state = 'CLOSED', closed_at = now(), close_reason = 'admin'
        where id = $1 and state <> 'CLOSED'
       returning id, user_id, device_id, product_id
     ), r as (
       update npap.refresh_token t set revoked_at = now()
         from s where t.user_id = s.user_id and t.device_id = s.device_id and t.revoked_at is null
       returning t.id
     ), a as (
       insert into npap.audit_event (kind, user_id, product_id, session_id, device_id, detail)
       select 'admin.session_closed', s.user_id, s.product_id, s.id, s.device_id, $2 from s
     )
     select count(*)::int as n from s`,
    [sessionId, actor]
  );
  return row?.n > 0;
}

/** Libera a vaga do computador na licença (e tira o acesso dele a esse produto). */
export async function releaseDevice(licenseId, deviceId, actor, kind = "admin.device_released") {
  const row = await queryOne(
    `with ld as (
       update npap.license_device set released_at = now()
        where license_id = $1 and device_id = $2 and released_at is null
       returning license_id, device_id
     ), r as (
       update npap.refresh_token t set revoked_at = now()
         from ld where t.device_id = ld.device_id and t.license_id = ld.license_id and t.revoked_at is null
       returning t.user_id, t.product_id
     ), s as (
       update npap.session x set state = 'CLOSED', closed_at = now(), close_reason = 'revoked'
         from ld where x.device_id = ld.device_id and x.license_id = ld.license_id and x.state <> 'CLOSED'
       returning x.id
     ), a as (
       insert into npap.audit_event (kind, user_id, device_id, detail)
       select $4, d.user_id, d.id, $3 from npap.device d join ld on ld.device_id = d.id
     )
     select count(*)::int as n from ld`,
    [licenseId, deviceId, actor, kind]
  );
  return row?.n > 0;
}

/** Bloqueia (ou desbloqueia) o computador para a conta inteira. */
export async function setDeviceBlocked(deviceId, blocked, actor) {
  if (!blocked) {
    const row = await queryOne(
      `with d as (update npap.device set revoked_at = null where id = $1 and revoked_at is not null returning id, user_id)
       , a as (insert into npap.audit_event (kind, user_id, device_id, detail) select 'admin.device_unblocked', user_id, id, $2 from d)
       select count(*)::int as n from d`,
      [deviceId, actor]
    );
    return row?.n > 0;
  }
  const row = await queryOne(
    `with d as (
       update npap.device set revoked_at = now() where id = $1 and revoked_at is null returning id, user_id
     ), r as (
       update npap.refresh_token t set revoked_at = now() from d where t.device_id = d.id and t.revoked_at is null returning t.id
     ), s as (
       update npap.session x set state = 'CLOSED', closed_at = now(), close_reason = 'revoked'
         from d where x.device_id = d.id and x.state <> 'CLOSED' returning x.id
     ), a as (
       insert into npap.audit_event (kind, user_id, device_id, detail) select 'admin.device_blocked', user_id, id, $2 from d
     )
     select count(*)::int as n from d`,
    [deviceId, actor]
  );
  return row?.n > 0;
}

/** A licença pertence a esta conta? (mesma regra de Minha conta) */
export async function licenseBelongsTo(licenseId, user) {
  const row = await queryOne(
    `select 1 as ok from public.licenses
      where id = $1 and (user_id = $2 or lower(customer_email) = lower($3))`,
    [licenseId, user.id, user.email || ""]
  );
  return Boolean(row);
}
