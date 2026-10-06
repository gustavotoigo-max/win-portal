import "server-only";

import { getAuthSession } from "@/lib/auth/server";
import { isDatabaseConfigured, query } from "@/lib/neon/database";

export async function getCurrentUser() {
  try {
    const session = await getAuthSession();
    return session?.user || null;
  } catch {
    return null;
  }
}

// Garante a linha em profiles antes de gravar pedidos e licencas (chave estrangeira).
export async function ensureProfile(user) {
  if (!user?.id || !isDatabaseConfigured()) return;

  await query(
    `insert into public.profiles (user_id, email, full_name)
     values ($1, $2, $3)
     on conflict (user_id) do nothing`,
    [user.id, String(user.email || "").toLowerCase(), user.name || null]
  );
}

export function safeNextPath(next, fallback = "/pt/dashboard") {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    return next;
  }
  return fallback;
}
