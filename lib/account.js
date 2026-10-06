import "server-only";

import { decryptLicenseKey } from "@/lib/license-crypto";
import { query } from "@/lib/neon/database";
import { getProductPage } from "@/lib/product-pages";

export const statusLabels = {
  active: "Ativa",
  revoked: "Revogada",
  blocked: "Bloqueada",
  expired: "Expirada"
};

export function formatDate(value, withTime = false) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export function formatCents(cents) {
  if (cents === null || cents === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function displayKey(row) {
  return decryptLicenseKey(row.license_key_ciphertext) || row.license_key || `WIN-····-····-····-${row.license_key_hint || "····"}`;
}

export async function getCustomerLicenses(user, { orderNumber } = {}) {
  const parameters = [user.id, user.email || ""];
  let orderFilter = "";
  if (orderNumber) {
    parameters.push(orderNumber);
    orderFilter = "and o.order_number = $3";
  }

  const rows = await query(
    `select l.id, l.product_id, l.license_key, l.license_key_ciphertext, l.license_key_hint,
            l.status, l.max_machines, l.expires_at, l.created_at,
            o.order_number, o.created_at as order_created_at
     from public.licenses l
     left join public.orders o on o.id = l.order_id
     where (l.user_id = $1 or lower(l.customer_email) = lower($2)) ${orderFilter}
     order by l.created_at desc`,
    parameters
  );

  if (!rows.length) return [];

  const activations = await query(
    `select id, license_id, machine_id, machine_name, software_version, status,
            activated_at, last_seen_at
     from public.activations
     where license_id = any($1::uuid[])
     order by activated_at desc`,
    [rows.map((row) => row.id)]
  );

  return rows.map((row) => {
    const product = getProductPage(row.product_id);
    const expired = row.expires_at && new Date(row.expires_at) < new Date();
    const status = expired && row.status === "active" ? "expired" : row.status;
    const machines = activations
      .filter((activation) => activation.license_id === row.id)
      .map((activation) => ({
        id: activation.id,
        name: activation.machine_name || activation.machine_id,
        status: activation.status,
        version: activation.software_version || null,
        activatedAt: formatDate(activation.activated_at),
        lastSeen: formatDate(activation.last_seen_at || activation.activated_at, true)
      }));

    return {
      id: row.id,
      key: displayKey(row),
      status,
      statusLabel: statusLabels[status] || status,
      product,
      maxMachines: row.max_machines,
      activeMachines: machines.filter((machine) => machine.status === "active").length,
      machines,
      orderNumber: row.order_number || "-",
      purchasedAt: formatDate(row.order_created_at || row.created_at),
      validity: row.expires_at ? `Até ${formatDate(row.expires_at)}` : "Vitalícia"
    };
  });
}

export async function getCustomerOrders(user) {
  // select o.* evita depender das colunas novas da loja antes da migracao.
  const rows = await query(
    `select o.*
     from public.orders o
     where o.user_id = $1 or lower(o.customer_email) = lower($2)
     order by o.created_at desc`,
    [user.id, user.email || ""]
  );

  return rows.map((row) => {
    const product = getProductPage(row.product_id);
    return {
      id: row.id,
      number: row.order_number,
      product: product?.title || "-",
      date: formatDate(row.created_at),
      subtotal: formatCents(row.subtotal ?? row.amount),
      discount: row.discount ? formatCents(row.discount) : null,
      coupon: row.coupon_code || null,
      total: formatCents(row.amount),
      status: row.status === "paid" ? "Concluído" : row.status === "pending" ? "Pendente" : row.status === "refunded" ? "Reembolsado" : "Cancelado",
      origin: row.payment_method === "simulado" ? "Loja" : row.stripe_session_id ? "Stripe" : "Emitido pelo suporte"
    };
  });
}
