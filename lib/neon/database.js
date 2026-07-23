import "server-only";

import { neon } from "@neondatabase/serverless";

let sqlClient;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

export async function query(text, parameters = []) {
  return getDatabase().query(text, parameters);
}

export async function queryOne(text, parameters = []) {
  const rows = await query(text, parameters);
  return rows[0] || null;
}
