import "server-only";

import { isDatabaseConfigured, query } from "@/lib/neon/database";

const allowedMethods = new Set(["password", "google", "sso", "unknown"]);

export async function recordUserLoginMethod({
  user,
  method = "unknown",
  provider = null,
  fullName = null,
  company = null,
  preferredLocale = "pt"
}) {
  if (!user?.id || !isDatabaseConfigured()) {
    return { ok: false, skipped: true };
  }

  const loginMethod = allowedMethods.has(method) ? method : "unknown";
  try {
    await query(
      `insert into public.profiles (
         user_id, email, full_name, company, preferred_locale,
         login_method, login_provider, last_login_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (user_id) do update set
         email = excluded.email,
         full_name = coalesce(excluded.full_name, profiles.full_name),
         company = coalesce(excluded.company, profiles.company),
         preferred_locale = coalesce(excluded.preferred_locale, profiles.preferred_locale),
         login_method = excluded.login_method,
         login_provider = excluded.login_provider,
         last_login_at = now()`,
      [
        user.id,
        user.email,
        fullName || user.name || null,
        company || null,
        preferredLocale === "en" ? "en" : "pt",
        loginMethod,
        provider || loginMethod
      ]
    );
  } catch (error) {
    console.error("Could not record login method:", error.message);
    return { ok: false, error };
  }

  return { ok: true };
}
