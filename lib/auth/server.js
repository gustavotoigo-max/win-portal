import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

let authInstance;

export function isAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET?.length >= 32
  );
}

export function getAuth() {
  if (!isAuthConfigured()) {
    throw new Error("Neon Auth is not configured.");
  }

  if (!authInstance) {
    authInstance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET
      }
    });
  }

  return authInstance;
}

export async function getAuthSession() {
  if (!isAuthConfigured()) return null;

  const { data, error } = await getAuth().getSession();
  if (error) {
    console.error("Could not read Neon Auth session:", error.message);
    return null;
  }

  return data || null;
}
