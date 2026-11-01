import "server-only";

import { query, queryOne } from "@/lib/neon/database";

// Login dos aplicativos pelo navegador (servidor NPAPcore). O servidor cria o pedido em
// npap.device_authorization; esta parte do site so mostra o pedido e grava a decisao.
// Ver neon/migrations/20261101_npap_server.sql.

/** Normaliza o que a pessoa digitou ("abcd efgh", "ABCD-EFGH") para ABCD-EFGH, ou null. */
export function normalizeUserCode(value) {
  const letters = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  return letters.length === 8 ? `${letters.slice(0, 4)}-${letters.slice(4)}` : null;
}

/** Pedido pendente e dentro do prazo, com o nome do produto. */
export async function getPendingRequest(userCode) {
  if (!userCode) return null;
  return queryOne(
    `select da.id, da.product_id, p.name as product_name, da.device_label, da.client_version,
            da.created_at, da.expires_at
       from npap.device_authorization da
       join npap.product p on p.id = da.product_id
      where da.user_code = $1 and da.status = 'pending' and da.expires_at > now()`,
    [userCode]
  );
}

/** A conta tem licenca ativa para o produto? (mesma regra que o servidor usa) */
export async function hasValidLicense(user, productId) {
  const row = await queryOne(
    "select license_id from npap.valid_license($1, $2, $3)",
    [user.id, productId, Boolean(user.emailVerified)]
  );
  return Boolean(row);
}

export async function approveRequest(requestId, user) {
  const row = await queryOne(
    `update npap.device_authorization
        set status = 'approved', user_id = $2, approved_email = $3,
            approved_email_verified = $4, decided_at = now()
      where id = $1 and status = 'pending' and expires_at > now()
      returning id`,
    [requestId, user.id, String(user.email || "").toLowerCase(), Boolean(user.emailVerified)]
  );
  return Boolean(row);
}

export async function denyRequest(userCode, reason) {
  await query(
    `update npap.device_authorization
        set status = 'denied', deny_reason = $2, decided_at = now()
      where user_code = $1 and status = 'pending'`,
    [userCode, reason]
  );
}
